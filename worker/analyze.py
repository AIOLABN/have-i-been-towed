"""Run the supplied CV pipeline and encode reviewable evidence for the web API."""
import base64
import json
import pathlib
import sys


def limit_candidates(ranked):
    """The hosted API accepts at most five ranked candidates per clip."""
    return ranked[:5]


def analyze_video(path):
    import cv2
    from backend.cv import tow_cv_only as pipeline
    probe = cv2.VideoCapture(str(path))
    if not probe.isOpened():
        raise ValueError('Video could not be decoded.')
    fps = probe.get(cv2.CAP_PROP_FPS) or 30
    frames = probe.get(cv2.CAP_PROP_FRAME_COUNT)
    probe.release()
    if frames / fps > 300:
        raise ValueError('Use a clip shorter than five minutes.')
    every = 5
    _, total_frames, tracks, fps = pipeline.read_video(path, every=every, min_conf=0.80, min_len=5, max_len=8, debug=False, target='towed', move_thr=0.5, rigid_ratio=0.3)
    chosen, rivals, _ = pipeline.select_towed(tracks, fps, every, 3.0, 0.15, 2, 1)
    merged = pipeline.merge_reads([] if rivals else chosen)
    accepted = []
    for plate in limit_candidates(pipeline.pick_plates(merged, 2)):
        data = merged[plate]
        votes = len(data['confs'])
        frame = data['best_frame']
        snapshot = None
        if frame is not None:
            height, width = frame.shape[:2]
            scale = min(1, 960 / max(height, width))
            frame = cv2.resize(frame, (max(1, int(width * scale)), max(1, int(height * scale))))
            ok, encoded = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ok and len(encoded) < 1000000:
                snapshot = base64.b64encode(encoded.tobytes()).decode()
        accepted.append({'plate': plate, 'confidence': float(sum(data['confs']) / votes), 'votes': votes, 'snapshot_base64': snapshot})
    return {'analyzed_frames': (total_frames + every - 1) // every, 'detections': accepted}


if __name__ == '__main__':
    path, output = map(pathlib.Path, sys.argv[1:3])
    output.write_text(json.dumps(analyze_video(path)))
