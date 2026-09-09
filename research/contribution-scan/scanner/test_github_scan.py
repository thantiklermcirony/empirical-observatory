import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch
import urllib.error
import github_scan
from github_scan import normalize, query_for, run, ScanInterrupted, fetch_page, NoRedirect

def issue(number=1, **kwargs):
    return dict(repository_url='https://api.github.com/repos/owner/repo', number=number,
                html_url=f'https://github.com/owner/repo/issues/{number}', title='Missing data benchmark',
                state='open', body='A timestamp conflict', labels=[], **kwargs)

CONFIG = {'groups': [{'id': 'first', 'repositories': ['owner/repo']}]}
def page_fetch(query, page, token):
    return response([issue(page)], 150)

def response(items, total, incomplete=False):
    return {'items': items, 'total_count': total, 'incomplete_results': incomplete}, {'retrievedAt': '2026-09-09T00:00:00Z', 'totalCount': total, 'incompleteResults': incomplete}

class ScannerTests(unittest.TestCase):
    def test_excludes_pr(self):
        self.assertIsNone(normalize(issue(pull_request={}), 'a', 'today'))
    def test_excludes_closed(self):
        data = issue(); data['state'] = 'closed'
        self.assertIsNone(normalize(data, 'a', 'today'))
    def test_body_not_persisted(self):
        result = normalize(issue(), 'a', 'today')
        self.assertNotIn('body', result)
        self.assertEqual(len(result['bodySha256']), 64)
        self.assertIn('time_and_order', result['triageFamilies'])
        self.assertEqual(result['reviewStatus'], 'unreviewed_lead')
    def test_query_rejects_injection(self):
        with self.assertRaises(ValueError):
            query_for({'repositories': ['owner/repo is:closed']})
    def test_query_enforces_public_scope_even_with_named_repos(self):
        self.assertIn('is:public', query_for(CONFIG['groups'][0]).split())
    def test_budget_checkpoint_and_resume(self):
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            result = run(CONFIG, tmp, 2, 1, fetch=page_fetch)
            self.assertEqual(result['stop']['reason'], 'request_budget')
            self.assertFalse(result['coverage'][0]['complete'])
            result = run(CONFIG, tmp, 2, 1, True, fetch=page_fetch)
            self.assertEqual(result['requestsThisRun'], 1)
            self.assertEqual(result['uniqueOpenIssues'], 2)
            self.assertIsNone(result['stop'])
    def test_rate_limit_preserves_prior_results(self):
        def fetch(query, page, token):
            if page == 2:
                raise ScanInterrupted({'reason': 'http_error', 'status': 403})
            return page_fetch(query, page, token)
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            result = run(CONFIG, tmp, 2, 2, fetch=fetch)
            self.assertEqual(result['uniqueOpenIssues'], 1)
            self.assertEqual(result['stop']['status'], 403)
            self.assertTrue((Path(tmp)/'snapshot.json').exists())
    def test_config_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            run(CONFIG, tmp, 1, 1, fetch=page_fetch)
            with self.assertRaises(ValueError):
                run({'groups': []}, tmp, 1, 1, True, fetch=page_fetch)
    def test_foreign_repo_response_excluded(self):
        def fetch(query, page, token):
            data, meta = page_fetch(query, page, token)
            data['items'][0]['repository_url'] = 'https://api.github.com/repos/someone/else'
            return data, meta
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(run(CONFIG, tmp, 1, 1, fetch=fetch)['uniqueOpenIssues'], 0)
    def test_repeated_issue_across_pages_cannot_complete_coverage(self):
        def fetch(query, page, token):
            numbers = range(1, 101) if page == 1 else range(100, 200)
            return response([issue(n) for n in numbers], 200)
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            result = run(CONFIG, tmp, 2, 2, fetch=fetch)
        coverage = result['coverage'][0]
        self.assertEqual(coverage['returnedItems'], 200)
        self.assertEqual(coverage['uniqueIssuesRetrieved'], 199)
        self.assertEqual(coverage['duplicateItems'], 1)
        self.assertFalse(coverage['complete'])
    def test_case_insensitive_identity_merges_overlapping_groups(self):
        config = {'groups': [CONFIG['groups'][0], {'id': 'second', 'repositories': ['Owner/Repo']}]}
        def fetch(query, page, token):
            item = issue()
            if 'repo:Owner/Repo' in query:
                item['repository_url'] = 'https://api.github.com/repos/Owner/Repo'
                item['html_url'] = 'https://github.com/Owner/Repo/issues/1'
            return response([item], 1)
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            result = run(config, tmp, 1, 2, fetch=fetch)
        self.assertEqual(result['uniqueOpenIssues'], 1)
        self.assertEqual(result['issues'][0]['queryGroups'], ['first', 'second'])
        self.assertTrue(all(c['complete'] for c in result['coverage']))
    def test_incomplete_zero_result_page_is_retried_on_resume(self):
        calls = []
        def fetch(query, page, token):
            calls.append(page)
            return response([], 0, incomplete=len(calls) == 1)
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            first = run(CONFIG, tmp, 1, 1, fetch=fetch)
            self.assertFalse(first['coverage'][0]['complete'])
            second = run(CONFIG, tmp, 1, 1, True, fetch=fetch)
        self.assertEqual(calls, [1, 1])
        self.assertEqual(len(second['pages']), 1)
        self.assertTrue(second['coverage'][0]['complete'])
    def test_legacy_scope_snapshot_cannot_be_silently_mixed(self):
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            run(CONFIG, tmp, 1, 1, fetch=lambda *a: response([issue()], 1))
            path = Path(tmp) / 'snapshot.json'
            legacy = json.loads(path.read_text())
            legacy['schemaVersion'] = 1
            del legacy['pages'][0]['issueKeys']
            path.write_text(json.dumps(legacy))
            before = path.read_bytes()
            with self.assertRaisesRegex(ValueError, 'new output folder'):
                run(CONFIG, tmp, 1, 1, True, fetch=lambda *a: response([issue()], 1))
            self.assertEqual(before, path.read_bytes())
    def test_retry_replaces_page_membership_and_removes_orphaned_rows(self):
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            run(CONFIG, tmp, 1, 1, fetch=lambda *a: response([issue()], 1, incomplete=True))
            second = run(CONFIG, tmp, 1, 1, True, fetch=lambda *a: response([], 0))
        self.assertEqual(second['uniqueOpenIssues'], 0)
        self.assertEqual(second['coverage'][0]['returnedItems'], 0)
        self.assertTrue(second['coverage'][0]['complete'])
    def test_breadth_first_request_budget(self):
        config = {'groups': [CONFIG['groups'][0], {'id': 'second', 'repositories': ['other/repo']}]}
        calls = []
        def fetch(query, page, token):
            calls.append((query, page))
            return page_fetch(query, page, token)
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            result = run(config, tmp, 2, 2, fetch=fetch)
        self.assertEqual([p for _, p in calls], [1, 1])
        self.assertIn('repo:owner/repo', calls[0][0])
        self.assertIn('repo:other/repo', calls[1][0])
        self.assertEqual(result['stop']['reason'], 'request_budget')
    def test_search_thousand_result_ceiling_remains_incomplete(self):
        def fetch(query, page, token):
            return response([issue(n) for n in range((page - 1) * 100, page * 100)], 1001)
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            result = run(CONFIG, tmp, 10, 10, fetch=fetch)
        self.assertEqual(result['coverage'][0]['uniqueIssuesRetrieved'], 1000)
        self.assertTrue(result['coverage'][0]['searchCeilingReached'])
        self.assertFalse(result['coverage'][0]['complete'])
    def test_malformed_response_stops_without_losing_previous_page(self):
        def fetch(query, page, token):
            if page == 1:
                return page_fetch(query, page, token)
            return {'items': [], 'total_count': 'unknown', 'incomplete_results': False}, {}
        with tempfile.TemporaryDirectory() as tmp, contextlib.redirect_stdout(io.StringIO()):
            result = run(CONFIG, tmp, 2, 2, fetch=fetch)
            saved = json.loads((Path(tmp) / 'snapshot.json').read_text())
        self.assertEqual(result['stop']['reason'], 'invalid_search_response')
        self.assertEqual(saved['uniqueOpenIssues'], 1)
        self.assertEqual(len(saved['pages']), 1)
    def test_token_only_in_authorization_header(self):
        payload, _ = response([], 0)
        http_response = MagicMock()
        http_response.read.return_value = json.dumps(payload).encode()
        http_response.headers = {}
        http_response.__enter__.return_value = http_response
        opener = MagicMock()
        opener.open.return_value = http_response
        secret = 'test-only-token-keep-out-of-snapshots'
        with patch('github_scan.urllib.request.build_opener', return_value=opener):
            data, metadata = fetch_page(query_for(CONFIG['groups'][0]), 1, secret)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.get_header('Authorization'), 'Bearer ' + secret)
        self.assertNotIn(secret, request.full_url)
        self.assertNotIn(secret, json.dumps([data, metadata]))
        self.assertIsNone(NoRedirect().redirect_request(request, None, 302, '', {}, 'https://elsewhere.invalid/'))
    def test_http_error_does_not_save_token_or_response_body(self):
        secret = 'test-secret-in-an-error-body'
        error = urllib.error.HTTPError('https://api.github.com/search/issues', 403, 'Forbidden', {}, io.BytesIO(secret.encode()))
        opener = MagicMock()
        opener.open.side_effect = error
        with patch('github_scan.urllib.request.build_opener', return_value=opener):
            with self.assertRaises(ScanInterrupted) as caught:
                fetch_page(query_for(CONFIG['groups'][0]), 1, secret)
        self.assertNotIn(secret, json.dumps(caught.exception.details))
        self.assertEqual(caught.exception.details['status'], 403)
    def test_environment_token_is_opt_in(self):
        with tempfile.TemporaryDirectory() as tmp:
            config_path = Path(tmp) / 'config.json'
            config_path.write_text(json.dumps(CONFIG))
            with patch.dict('os.environ', {'GITHUB_TOKEN': 'test-token'}), \
                    patch('sys.argv', ['github_scan.py', '--config', str(config_path)]), \
                    patch('github_scan.run', return_value={'uniqueOpenIssues': 0, 'stop': None}) as mocked, \
                    contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(github_scan.main(), 0)
                self.assertIsNone(mocked.call_args.kwargs['token'])

if __name__ == '__main__':
    unittest.main()
