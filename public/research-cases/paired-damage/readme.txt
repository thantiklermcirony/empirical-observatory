The folder contains two categories of files, contained in 2 subfolders:
"Statistical figure source data": Statistics calculated from the longitudinal dataset;
"Longitudinal dataset": Dataset which the study is based on.

Files in both categories are named to indicate the figure panels they are presented in. 

Statistical figure source data/: .csv tables in these files are self-explanatory
-----------------------------------------------------------
"Figure 1g-h GB2 fitted parameters.csv"
"Figure 2a-e initial conditions.csv"
"Figure 3a-e stats.csv"
"Figure 3g time-to-die.csv"
"Figure 4d-g simulation stats.csv"
"Figure 4h simulation NA.csv"
"Figure 4i simulation KM.csv"
"Figure 5e-h stats rpoS.csv"
"Figure 5e-h stats wt.csv"
"Figure S4 logpvalues.csv"


Longitudinal dataset/
-----------------------------------------------------------
"Cell info wt (Figure 1e).csv", "Cell info rpoS (Figure 5cd).csv":
Containing lifespans of each cell. The 3rd columns contains flags indicating right censorship. 1 indicate death; 2 indicate right censorship.

"PI timeseries wt (Figure 1c).csv", "PI timeseries rpoS (Figure 5a).csv":
Containing the PI fluorescence timeseries of each cell. Colormaps in figure 1c and 5a are generated from these tables after normalisation.

"Damage PI uptake wt (Figure 1d,f).csv", "Damage PI uptake rpoS (Figure 5b).csv":
Containing the estimated damage time series measured as PI uptake rates. Notice that the discretisation are done in 7h windows for wildtype but 5h windows for ΔrpoS.  Colormaps in figure 1d and 5b are generated directly from these tables, while figure 1f plots the same data from figure 1d as a line plot.

"Model simulations (Figure 4).csv":
Containing simulations of MP-SR model, using maximum likelihood parameters estimated from wildtype data, as reported in the main text. Initial damage states are based on damage distributions found in the data "Damage PI uptake wt (Figure 1d,f).csv". 10 simulation runs are generated for every data damage estimate at 24.5h. 1st column in this file contains cell names to identify different simulation trajectories. 2nd column is a counter of total number of rows containing damage observations among all cells. 3rd and 4th columns contains age and PI uptake rates of an damage observation.



