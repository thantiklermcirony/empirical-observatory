"""Bounded, read-only GitHub issue inventory. Python 3.10+, standard library only.

Search results are leads, never evidence of scientific novelty or bug validity.
No issue bodies, credentials, or complete comments are written to the snapshot.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

API = 'https://api.github.com'
VERSION = '0.1.1'
FAMILIES = {
    'state_and_observation': ('partial observ', 'hidden state', 'missing modal', 'missing data', 'go cue', 'observation', 'state estimation'),
    'time_and_order': ('timestamp', 'temporal', 'invalidation', 'conflict', 'out of order', 'event time', 'zero-order', 'time alignment'),
    'evidence_and_evaluation': ('baseline', 'benchmark', 'leakage', 'claim support', 'calibration', 'ground truth', 'posterior predictive'),
    'geometry_and_constraints': ('constraint', 'gradient', 'derivative', 'topolog', 'stability', 'coordinate', 'slicing', 'manifold'),
    'experimental_design': ('power analysis', 'experimental design', 'acquisition', 'sampling', 'sampler', 'random seed', 'uncertainty'),
}

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf8')
    temporary.replace(path)

def query_for(group):
    repos = group['repositories']
    if not repos or any(not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', r) for r in repos):
        raise ValueError('Every group needs valid owner/repository names.')
    # Repeated repo qualifiers select a union of repositories. No keyword filter:
    # retain negative leads and avoid restricting discovery to our terminology.
    # A token may have access to private repositories. Enforce the public-only
    # scope in the query, rather than relying on the configured names.
    query = 'is:issue is:open is:public ' + ' '.join('repo:' + repo for repo in repos)
    if len(query) > 256:
        raise ValueError('Split this group: the search query exceeds 256 characters.')
    return query

def repo_from_url(url):
    match = re.fullmatch(r'https://api\.github\.com/repos/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)', url or '')
    return match.group(1) if match else None

def normalize(item, group_id, retrieved_at):
    if 'pull_request' in item or item.get('state') != 'open':
        return None
    repo = repo_from_url(item.get('repository_url'))
    if not repo:
        return None
    body = item.get('body') or ''
    text = (item.get('title', '') + '\n' + body).lower()
    families = [name for name, terms in FAMILIES.items() if any(term in text for term in terms)]
    return {
        'repository': repo, 'number': item['number'], 'url': item['html_url'],
        'title': item.get('title', ''), 'state': item['state'],
        'createdAt': item.get('created_at'), 'updatedAt': item.get('updated_at'),
        'verifiedAt': retrieved_at, 'labels': [label['name'] for label in item.get('labels', [])],
        'commentsCount': item.get('comments', 0), 'assigneeCount': len(item.get('assignees', [])),
        'authorAssociation': item.get('author_association'),
        'bodySha256': hashlib.sha256(body.encode('utf8')).hexdigest(),
        'triageFamilies': families, 'queryGroups': [group_id],
        'reviewStatus': 'unreviewed_lead',
        'limitations': 'Keyword match is not framework fit; issue status is not reproduction. Check comments, linked PRs and current source.',
    }

class ScanInterrupted(Exception):
    def __init__(self, details):
        self.details = details
        super().__init__(details['reason'])

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def validate_search_data(data):
    if (not isinstance(data, dict)
            or not isinstance(data.get('items'), list)
            or type(data.get('total_count')) is not int
            or data['total_count'] < 0
            or type(data.get('incomplete_results')) is not bool
            or any(not isinstance(item, dict) for item in data['items'])):
        raise ValueError('Invalid GitHub search response shape.')

def fetch_page(query, page, token=None):
    params = urllib.parse.urlencode({'q': query, 'sort': 'updated', 'order': 'desc', 'per_page': 100, 'page': page})
    url = API + '/search/issues?' + params
    headers = {'User-Agent': 'EmpiricalArchitectureOpportunityScan/' + VERSION,
               'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(url, headers=headers, method='GET')
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
            payload = response.read(16 * 1024 * 1024 + 1)
            if len(payload) > 16 * 1024 * 1024:
                raise ScanInterrupted({'reason': 'response_size_limit', 'url': url})
            data = json.loads(payload)
            validate_search_data(data)
            metadata = {'url': url, 'retrievedAt': now(), 'totalCount': data['total_count'],
                        'incompleteResults': data['incomplete_results'],
                        'rateRemaining': response.headers.get('X-RateLimit-Remaining'),
                        'rateReset': response.headers.get('X-RateLimit-Reset'),
                        'responseSha256': hashlib.sha256(payload).hexdigest()}
            return data, metadata
    except urllib.error.HTTPError as exc:
        raise ScanInterrupted({'reason': 'http_error', 'status': exc.code, 'url': url,
                               'retryAfter': exc.headers.get('Retry-After'),
                               'rateReset': exc.headers.get('X-RateLimit-Reset')}) from exc
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        # Avoid logging request headers, response bodies or credentials.
        raise ScanInterrupted({'reason': 'transport_or_json_error', 'type': type(exc).__name__, 'url': url}) from exc

def summarize_coverage(group, pages, requested_pages):
    if not pages:
        return {'group': group['id'], 'repositories': group['repositories'], 'pagesRetrieved': 0, 'complete': False}
    count = sum(p['returnedItems'] for p in pages)
    total = max(p['totalCount'] for p in pages)
    # Raw row counts can reach total_count while moving issues repeat on two
    # pages. Persist identities so coverage reflects distinct in-scope issues.
    identities_known = all('issueKeys' in p for p in pages)
    keys = [key for p in pages for key in p.get('issueKeys', [])]
    unique = len(set(keys)) if identities_known else None
    excluded = count - len(keys) if identities_known else None
    return {'group': group['id'], 'repositories': group['repositories'], 'pagesRetrieved': len(pages),
            'requestedPageCap': requested_pages, 'returnedItems': count, 'reportedTotalCount': total,
            'uniqueIssuesRetrieved': unique,
            'duplicateItems': len(keys) - unique if identities_known else None,
            'excludedItems': excluded, 'identityCoverageKnown': identities_known,
            'complete': identities_known and unique >= total and excluded == 0
                        and not any(p['incompleteResults'] for p in pages),
            'searchCeilingReached': total > 1000,
            'incompleteResults': any(p['incompleteResults'] for p in pages),
            'caveat': 'Updated-time pagination is not an atomic snapshot; changing issues can move between pages.'}

def issue_key(item):
    # GitHub repository names are case-insensitive; URL spelling must not create
    # duplicate records when groups overlap or the API returns canonical casing.
    return item['repository'].lower() + '#' + str(item['number'])

def run(config, out, max_pages, max_requests, resume=False, fetch=fetch_page, token=None):
    if not 1 <= max_pages <= 10 or not 1 <= max_requests <= 30:
        raise ValueError('max-pages must be 1..10 and max-requests 1..30.')
    out = Path(out)
    config_hash = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
    path = out / 'snapshot.json'
    previous = json.loads(path.read_text(encoding='utf8')) if resume and path.exists() else {}
    if previous and previous['configSha256'] != config_hash:
        raise ValueError('Cannot resume a snapshot with a different configuration.')
    if previous and previous.get('schemaVersion') != 2:
        # Version 1 did not enforce is:public and lacks per-page identities.
        # Keeping its records while retrying only some pages could retain
        # out-of-scope data. Preserve the old evidence; start a new output folder.
        raise ValueError('Older snapshots use different scope/coverage rules. Start a new output folder instead of resuming.')
    records = {}
    for item in previous.get('issues', []):
        key = issue_key(item)
        if key in records:
            item['queryGroups'] = sorted(set(records[key]['queryGroups'] + item['queryGroups']))
        records[key] = item
    all_pages = previous.get('pages', [])
    # Retry incomplete pages on resume. A page without identity evidence must
    # also be fetched again. Completed pages remain cached.
    done = {(p['group'], p['page']) for p in all_pages
            if not p['incompleteResults'] and 'issueKeys' in p}
    requests = 0
    stop = None
    group_ids = [g['id'] for g in config['groups']]
    if len(group_ids) != len(set(group_ids)):
        raise ValueError('Group IDs must be unique.')
    queries = {g['id']: query_for(g) for g in config['groups']}
    def checkpoint():
        # Replacing an incomplete page also replaces its membership evidence.
        # Do not retain orphaned rows or obsolete group memberships from the
        # earlier response while declaring the corrected page complete.
        if all('issueKeys' in p for p in all_pages):
            memberships = {}
            for p in all_pages:
                for key in p['issueKeys']:
                    memberships.setdefault(key, set()).add(p['group'])
            for key in list(records):
                if key not in memberships:
                    del records[key]
                else:
                    records[key]['queryGroups'] = sorted(memberships[key])
        coverage = [summarize_coverage(g, [p for p in all_pages if p['group'] == g['id']], max_pages) for g in config['groups']]
        result = {'schemaVersion': 2, 'scannerVersion': VERSION, 'updatedAt': now(),
                  'configSha256': config_hash, 'scope': 'Named public repository issues only; bounded search, not all GitHub.',
                  'requestsThisRun': requests, 'stop': stop, 'coverage': coverage, 'pages': all_pages,
                  'uniqueOpenIssues': len(records), 'issues': sorted(records.values(), key=lambda i: (i['repository'].lower(), i['number']))}
        save_json(path, result)
        return result
    try:
        # Breadth-first: page one of every group before page two of any group.
        for page in range(1, max_pages + 1):
            for group in config['groups']:
                group_pages = [p for p in all_pages if p['group'] == group['id']]
                if (group['id'], page) in done:
                    continue
                retrying = any(p['page'] == page for p in group_pages)
                if (not retrying and group_pages
                        and not any(p['incompleteResults'] for p in group_pages)
                        and (page-1) * 100 >= max(p['totalCount'] for p in group_pages)):
                    continue
                if requests >= max_requests:
                    raise ScanInterrupted({'reason': 'request_budget', 'message': 'Resume later or deliberately increase request budget.'})
                requests += 1
                data, metadata = fetch(queries[group['id']], page, token)
                try:
                    validate_search_data(data)
                except ValueError:
                    raise ScanInterrupted({'reason': 'invalid_search_response', 'group': group['id'], 'page': page}) from None
                metadata.update({'group': group['id'], 'page': page, 'returnedItems': len(data['items']),
                                 'totalCount': data['total_count'], 'incompleteResults': data['incomplete_results'],
                                 'issueKeys': []})
                allowed_repos = {r.lower() for r in group['repositories']}
                for item in data['items']:
                    normalized = normalize(item, group['id'], metadata['retrievedAt'])
                    if normalized and normalized['repository'].lower() in allowed_repos:
                        key = issue_key(normalized)
                        metadata['issueKeys'].append(key)
                        old = records.get(key)
                        if old:
                            normalized['queryGroups'] = sorted(set(old['queryGroups'] + normalized['queryGroups']))
                        records[key] = normalized
                # A retry replaces the page's coverage evidence, rather than
                # double-counting both incomplete and corrected responses.
                all_pages[:] = [p for p in all_pages if (p['group'], p['page']) != (group['id'], page)]
                all_pages.append(metadata)
                if not metadata['incompleteResults']:
                    done.add((group['id'], page))
                checkpoint()
                print(json.dumps({'group': group['id'], 'page': page, 'returned': len(data['items']), 'total': data['total_count'], 'rateRemaining': metadata.get('rateRemaining')}), flush=True)
                if metadata.get('rateRemaining') == '0':
                    raise ScanInterrupted({'reason': 'rate_limit', 'rateReset': metadata.get('rateReset')})
    except ScanInterrupted as exc:
        stop = exc.details
    return checkpoint()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=Path(__file__).with_name('scan_config.json'))
    parser.add_argument('--out', type=Path, default=Path('scan-results'))
    parser.add_argument('--max-pages', type=int, default=1)
    parser.add_argument('--max-requests', type=int, default=8)
    parser.add_argument('--resume', action='store_true', help='Resume this dated scan; use a new output folder for a fresh scan.')
    parser.add_argument('--use-token', action='store_true', help='Read GITHUB_TOKEN from environment; never write/log it.')
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding='utf8'))
    token = os.environ.get('GITHUB_TOKEN') if args.use_token else None
    if args.use_token and not token:
        parser.error('--use-token requires GITHUB_TOKEN in the environment.')
    result = run(config, args.out, args.max_pages, args.max_requests, args.resume, token=token)
    print(json.dumps({'uniqueOpenIssues': result['uniqueOpenIssues'], 'stop': result['stop']}))
    return 2 if result['stop'] else 0

if __name__ == '__main__':
    sys.exit(main())
