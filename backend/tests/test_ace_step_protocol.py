from app.worker import _audio_reference, _decode_result


def test_decode_result_parses_ace_step_json_string():
    assert _decode_result('[{"file":"/v1/audio?path=/tmp/song.mp3"}]') == [
        {"file": "/v1/audio?path=/tmp/song.mp3"}
    ]


def test_audio_reference_extracts_official_audio_route():
    task = {
        "result": '[{"file":"/v1/audio?path=/tmp/song.mp3","status":1}]'
    }
    assert _audio_reference(task) == "/v1/audio?path=/tmp/song.mp3"


def test_audio_reference_rejects_unexpected_file_reference():
    task = {"result": '[{"file":"https://untrusted.example/song.mp3"}]'}
    assert _audio_reference(task) is None
