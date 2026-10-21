"""Checks for audio safety, deterministic synthesis and publication boundaries."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np

def module(name):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(name+'.py'))
    mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod

sounds=module('synthesize-sounds')
publish=module('publish-audio')

class AudioTests(unittest.TestCase):
    def test_every_event_design_is_finite_audible_and_reproducible(self):
        records=[r for r in sounds.manifest() if r['kind']=='sfx']
        self.assertEqual(len(records),240)
        fingerprints=set()
        import hashlib
        for r in records:
            x=sounds.render_event(r['family'],r['designIndex'],r['seed'])
            self.assertTrue(np.isfinite(x).all(),r['id'])
            self.assertGreater(float(np.sqrt(np.mean(x*x))),.005,r['id'])
            fingerprints.add(hashlib.sha256(x.tobytes()).hexdigest())
        self.assertEqual(len(fingerprints),240)
        np.testing.assert_array_equal(sounds.render_event('magic',7,32),sounds.render_event('magic',7,32))

    def test_seam_gate_rejects_a_broken_boundary(self):
        x=np.sin(np.arange(44100)*2*np.pi*100/44100)*.1
        self.assertTrue(sounds.qa_metrics(x,True)['seamPassed'])
        x[-1]=.8
        self.assertFalse(sounds.qa_metrics(x,True)['seamPassed'])
        self.assertFalse(sounds.qa_metrics(x,False)['seamPassed'])

    def test_sound_inventory_and_rights_are_unambiguous(self):
        records=sounds.manifest()
        self.assertEqual(len(records),280)
        self.assertEqual(len({r['id'] for r in records}),280)
        self.assertEqual(len({(r['kind'],r['family'],r['designIndex']) for r in records}),280)
        taxonomy=json.loads((sounds.ROOT/'music/taxonomy.json').read_text())
        for r in records:
            for scene in r['scenarios']: self.assertIn(scene,taxonomy['scenarios'])

    def test_publisher_excludes_rejected_review_even_with_cached_track(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); folder=root/'music/.cache/sound-design/sfx-test-01'; folder.mkdir(parents=True)
            (folder/'track.json').write_text(json.dumps({'id':'sfx-test-01','audioReview':{'suitableForLibrary':True,'audibleDefect':False,'voicesDetected':False},'rightsProfile':'original-synthesis-cc0'}))
            (folder/'state.json').write_text('{"state":"rejected"}')
            with patch.object(publish,'ROOT',root): self.assertEqual(publish.collect(),[])

    def test_asset_paths_cannot_escape_declared_track(self):
        record={'id':'safe','assets':{'preview':'https://music-cdn.shapeof.world/tracks/another/v1/preview.mp3'}}
        with self.assertRaises(ValueError): publish.assets(record)

if __name__=='__main__': unittest.main()
