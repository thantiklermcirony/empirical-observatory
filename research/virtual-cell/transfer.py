"""Conventional response transfer under a frozen missing-aware protocol.

Training functions receive source responses only. Held-out outcomes enter score(),
after predictions/configurations are finalized. This is not a cell generator.
"""
from __future__ import annotations
from dataclasses import dataclass
import numpy as np

GLOBAL_GRID=(0.0,0.25,0.5,0.75,1.0)
HETEROGENEITY_GRID=(0.0,0.25,0.5,1.0,2.0)

@dataclass(frozen=True)
class Moments:
    mean: np.ndarray
    count: np.ndarray
    magnitude: np.ndarray
    variance: np.ndarray
    mean_variance: np.ndarray
    eligible_genes: np.ndarray
    template: np.ndarray

def moments(sources:list[np.ndarray])->Moments:
    if not sources:raise ValueError('At least one training context is required')
    shape=sources[0].shape
    if len(shape)!=2 or not all(x.shape==shape for x in sources):raise ValueError('Aligned target/gene matrices required')
    if not all(shape):raise ValueError('Empty matrix')
    if len(sources)>255:raise ValueError('This small-context pilot supports at most255 sources')
    n_targets,n_genes=shape
    mu=np.empty(shape,dtype=np.float32);count=np.empty(shape,dtype=np.uint8)
    magnitude=np.full(n_targets,np.nan);variance=magnitude.copy();mean_variance=magnitude.copy()
    eligible_count=np.zeros(n_targets,dtype=np.int64)
    template_sum=np.zeros((len(sources),n_genes));template_count=np.zeros((len(sources),n_genes),dtype=np.int64)
    for start in range(0,n_targets,32):
        stop=min(start+32,n_targets)
        block=np.stack([np.asarray(x[start:stop],dtype=np.float64) for x in sources])
        if np.isinf(block).any():raise ValueError('Infinite training effect')
        finite=np.isfinite(block);n=finite.sum(axis=0)
        total=np.where(finite,block,0).sum(axis=0)
        mean=np.divide(total,n,out=np.zeros_like(total),where=n>0)
        residual=np.where(finite,block-mean,0)
        var=np.divide((residual**2).sum(axis=0),n-1,out=np.zeros_like(mean),where=n>=2)
        eligible=n>=2;ng=eligible.sum(axis=1)
        m=np.where(eligible,mean**2,0).sum(axis=1)
        v=np.where(eligible,var,0).sum(axis=1)
        q=np.divide(var,n,out=np.zeros_like(var),where=eligible).sum(axis=1)
        magnitude[start:stop]=np.divide(m,ng,out=np.full(len(ng),np.nan),where=ng>0)
        variance[start:stop]=np.divide(v,ng,out=np.full(len(ng),np.nan),where=ng>0)
        mean_variance[start:stop]=np.divide(q,ng,out=np.full(len(ng),np.nan),where=ng>0)
        eligible_count[start:stop]=ng
        mu[start:stop]=mean;count[start:stop]=n
        template_sum+=np.where(finite,block,0).sum(axis=1);template_count+=finite.sum(axis=1)
    context_means=np.divide(template_sum,template_count,out=np.zeros_like(template_sum),where=template_count>0)
    available=(template_count>0).sum(axis=0)
    template=np.divide(context_means.sum(axis=0),available,out=np.zeros(n_genes),where=available>0).astype(np.float32)
    return Moments(mu,count,magnitude,variance,mean_variance,eligible_count,template)

def shrinkage(stats:Moments,penalty:float)->np.ndarray:
    if not np.isfinite(penalty) or penalty<0:raise ValueError('Finite nonnegative penalty required')
    weights=np.ones(len(stats.magnitude))
    if penalty==0:return weights
    usable=stats.eligible_genes>0
    positive=usable & (stats.magnitude>0)
    weights[usable & ~positive]=0
    weights[positive]=np.maximum(1-penalty*stats.mean_variance[positive]/stats.magnitude[positive],0)
    return weights

def weighted_mean(stats:Moments,weights:float|np.ndarray)->np.ndarray:
    w=np.asarray(weights,dtype=np.float32)
    if w.ndim==1:w=w[:,None]
    if not np.isfinite(w).all():raise ValueError('Finite prediction weights required')
    return stats.mean*w

def score(prediction:np.ndarray,truth:np.ndarray)->dict[str,np.ndarray]:
    if prediction.shape!=truth.shape or prediction.ndim!=2:raise ValueError('Prediction/truth axes differ')
    if not np.isfinite(prediction).all():raise ValueError('Predictions must include finite fallback values')
    if np.isinf(truth).any():raise ValueError('Infinite truth')
    n_targets=len(truth)
    losses=np.full(n_targets,np.nan);cosine=losses.copy();counts=np.zeros(n_targets,dtype=np.int64)
    for start in range(0,n_targets,64):
        stop=min(start+64,n_targets)
        actual=np.asarray(truth[start:stop],dtype=np.float64)
        pred=np.asarray(prediction[start:stop],dtype=np.float64)
        valid=np.isfinite(actual);n=valid.sum(axis=1)
        actual=np.where(valid,actual,0);pred=np.where(valid,pred,0)
        squared=((pred-actual)**2).sum(axis=1)
        losses[start:stop]=np.divide(squared,n,out=np.full(len(n),np.nan),where=n>0)
        denominator=np.sqrt((pred**2).sum(axis=1)*(actual**2).sum(axis=1))
        cosine[start:stop]=np.divide((pred*actual).sum(axis=1),denominator,out=np.full(len(n),np.nan),where=denominator>0)
        counts[start:stop]=n
    return {'mse':losses,'cosine':cosine,'truth_genes':counts}

def macro(losses:np.ndarray)->float:
    finite=np.isfinite(losses)
    if not finite.any():raise ValueError('No scorable targets')
    return float(losses[finite].mean())

def tune(sources:list[np.ndarray])->dict:
    if len(sources)<3:raise ValueError('Nested context tuning requires at least3 training contexts')
    global_losses={x:[] for x in GLOBAL_GRID};heterogeneity_losses={x:[] for x in HETEROGENEITY_GRID}
    for held in range(len(sources)):
        stats=moments([x for i,x in enumerate(sources) if i!=held])
        truth=sources[held]
        for alpha in GLOBAL_GRID:
            global_losses[alpha].append(macro(score(weighted_mean(stats,alpha),truth)['mse']))
        for penalty in HETEROGENEITY_GRID:
            heterogeneity_losses[penalty].append(macro(score(weighted_mean(stats,shrinkage(stats,penalty)),truth)['mse']))
    global_average={x:float(np.mean(v)) for x,v in global_losses.items()}
    heterogeneity_average={x:float(np.mean(v)) for x,v in heterogeneity_losses.items()}
    return {'global_alpha':min(global_average,key=lambda x:(global_average[x],x)),
            'heterogeneity_penalty':min(heterogeneity_average,key=lambda x:(heterogeneity_average[x],-x)),
            'global_inner_losses':global_losses,'heterogeneity_inner_losses':heterogeneity_losses}

def predict(sources:list[np.ndarray],seed:int=20260910)->tuple[dict[str,np.ndarray],Moments,dict]:
    configuration=tune(sources)
    stats=moments(sources)
    rng=np.random.default_rng(seed)
    permuted=[source[rng.permutation(len(source))] for source in sources]
    negative=moments(permuted)
    predictions={
        'zero':np.zeros_like(stats.mean),
        'global_template':np.broadcast_to(stats.template,stats.mean.shape),
        'target_mean':stats.mean,
        'global_shrink':weighted_mean(stats,configuration['global_alpha']),
        'heterogeneity_shrink':weighted_mean(stats,shrinkage(stats,configuration['heterogeneity_penalty'])),
        'permuted_target_mean':negative.mean,
    }
    return predictions,stats,configuration

def risk_orders(stats:Moments,targets:list[str])->dict[str,np.ndarray]:
    if len(targets)!=len(stats.magnitude):raise ValueError('Target labels differ')
    denom=stats.magnitude+stats.variance
    relative=np.divide(stats.variance,denom,out=np.ones_like(denom),where=denom>0)
    relative[stats.eligible_genes==0]=np.inf
    values={'absolute_disagreement':stats.variance,'relative_disagreement':relative,'effect_magnitude':stats.magnitude}
    return {name:np.asarray(sorted(range(len(targets)),key=lambda i:(float(value[i]) if np.isfinite(value[i]) else np.inf,targets[i]))) for name,value in values.items()}
