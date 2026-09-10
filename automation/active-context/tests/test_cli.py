from pathlib import Path
import json
import os
import subprocess
import sys
import tempfile
import unittest

PACKAGE = Path(__file__).resolve().parents[1]


class CLIContract(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.repo = self.root/'repo'; self.repo.mkdir()
        self.script = self.repo/'check.py'; self.script.write_text('print("checked")\n')
        self.config = self.root/'checks.json'
        self.config.write_text(json.dumps({'schema_version':1,'checks':[{'id':'unit','claims':['behavior'],
            'argv':['{python}','check.py'],'scopes':['check.py'],'cost':2}]}))
        self.ledger = self.root/'receipts.jsonl'

    def tearDown(self):
        self.temp.cleanup()

    def call(self, action, *args):
        command = [sys.executable,'-m','active_context',action,'--ledger',str(self.ledger)]
        if action != 'verify':
            command += ['--repo',str(self.repo),'--config',str(self.config)]
        return subprocess.run([*command,*args],cwd=PACKAGE,capture_output=True,text=True,timeout=20)

    def test_actual_run_and_later_change(self):
        run = self.call('run','--check','unit')
        self.assertEqual(run.returncode,0,run.stderr)
        receipt = json.loads(run.stdout)
        self.assertEqual(receipt['stdout']['text'].splitlines(),['checked'])
        self.assertTrue(json.loads(self.call('inspect').stdout)['checks']['unit']['reusable'])
        self.script.write_text('raise SystemExit(1)\n')
        self.assertFalse(json.loads(self.call('inspect').stdout)['checks']['unit']['reusable'])
        failed = self.call('run','--check','unit')
        self.assertEqual(failed.returncode,1)
        self.assertEqual(json.loads(self.call('inspect').stdout)['checks']['unit']['status'],'failed')
        self.assertEqual(json.loads(self.call('verify').stdout)['records'],2)

    def test_plan_reports_budget_without_execution(self):
        self.script.write_text('from pathlib import Path\nPath("executed").write_text("yes")\n')
        result = json.loads(self.call('plan','--claim','behavior','--budget','1').stdout)
        self.assertFalse(result['complete'])
        self.assertFalse((self.repo/'executed').exists())
        result = json.loads(self.call('plan','--claim','behavior','--budget','2').stdout)
        self.assertEqual(result['selected_checks'],['unit'])
        self.assertTrue(result['execution_required'])
        self.assertFalse(self.ledger.exists())

    def test_bad_configuration_is_nonzero_json_error(self):
        self.config.write_text('{"schema_version":1,"schema_version":1,"checks":[]}')
        result = self.call('inspect')
        self.assertEqual(result.returncode,2)
        self.assertFalse(json.loads(result.stderr)['usable'])

    def test_output_prefix_does_not_discard_full_hash(self):
        import hashlib
        self.script.write_text('import sys\nsys.stdout.write("x"*65000)\n')
        result = json.loads(self.call('run','--check','unit').stdout)
        self.assertEqual(result['stdout']['bytes'],65000)
        self.assertTrue(result['stdout']['truncated'])
        self.assertEqual(result['stdout']['sha256'],hashlib.sha256(b'x'*65000).hexdigest())


if __name__ == '__main__':
    unittest.main()
