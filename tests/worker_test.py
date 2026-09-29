import importlib.util
import pathlib
import unittest
spec=importlib.util.spec_from_file_location('analyze',pathlib.Path(__file__).parents[1]/'worker/analyze.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class WorkerTests(unittest.TestCase):
 def test_candidate_limit_matches_api(self):
  self.assertTrue(hasattr(module,'limit_candidates'))
  self.assertEqual(module.limit_candidates(['A','B','C','D','E','F']),['A','B','C','D','E'])
  self.assertEqual(module.limit_candidates([]),[])
if __name__=='__main__':unittest.main()
