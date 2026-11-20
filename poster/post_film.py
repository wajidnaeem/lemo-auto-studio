"""Post one film to YouTube, Facebook (Reel) and Instagram (Reel) with the official APIs.
Reads films/<FILM_ID>/post.json and media/reel_9x16.mp4 (+ media/thumb.jpg). Writes films/<FILM_ID>/posted.json.
Runs inside GitHub Actions; keys come from the repo's encrypted secrets and are never printed."""
import json, os, sys, time, datetime, requests
FILM = os.environ['FILM_ID']; ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
post = json.load(open(f'{ROOT}/films/{FILM}/post.json', encoding='utf-8'))
VIDEO = f'{ROOT}/media/reel_9x16.mp4'; THUMB = f'{ROOT}/media/thumb.jpg'
want = [p.strip() for p in os.environ.get('PLATFORMS', 'youtube,facebook,instagram').split(',') if p.strip()]
G = 'https://graph.facebook.com/v21.0'
caption = (post.get('caption', '') + '\n\n' + ' '.join(post.get('hashtags', []))).strip()
out_path = f'{ROOT}/films/{FILM}/posted.json'
result = json.load(open(out_path)) if os.path.exists(out_path) else {}
size = os.path.getsize(VIDEO)

def youtube():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    creds = Credentials(None, refresh_token=os.environ['YT_REFRESH_TOKEN'], client_id=os.environ['YT_CLIENT_ID'],
                        client_secret=os.environ['YT_CLIENT_SECRET'], token_uri='https://oauth2.googleapis.com/token',
                        scopes=['https://www.googleapis.com/auth/youtube.upload'])
    yt = build('youtube', 'v3', credentials=creds, cache_discovery=False)
    title = post.get('youtube_title') or post['title']
    if '#shorts' not in title.lower() and len(title) <= 90: title = (title + ' #Shorts')[:100]
    body = {'snippet': {'title': title[:100], 'description': (post.get('youtube_description') or caption)[:4900],
                        'tags': [h.lstrip('#') for h in post.get('hashtags', [])][:15], 'categoryId': '24'},
            'status': {'privacyStatus': 'public', 'selfDeclaredMadeForKids': bool(post.get('made_for_kids', False))}}
    req = yt.videos().insert(part='snippet,status', body=body, media_body=MediaFileUpload(VIDEO, mimetype='video/mp4', resumable=True, chunksize=8 * 1024 * 1024))
    resp = None
    while resp is None: _, resp = req.next_chunk()
    vid = resp['id']
    try:
        if os.path.exists(THUMB): yt.thumbnails().set(videoId=vid, media_body=MediaFileUpload(THUMB, mimetype='image/jpeg')).execute()
    except Exception as e: print('youtube thumbnail skipped:', str(e)[:200])
    priv = resp.get('status', {}).get('privacyStatus')
    return {'url': f'https://youtube.com/shorts/{vid}', 'id': vid, 'privacy': priv}

def facebook():
    pid, tok = os.environ['META_PAGE_ID'], os.environ['META_PAGE_TOKEN']
    s = requests.post(f'{G}/{pid}/video_reels', data={'upload_phase': 'start', 'access_token': tok}, timeout=60).json()
    if 'video_id' not in s: raise RuntimeError(f'facebook start: {s.get("error", s)}')
    vid = s['video_id']
    with open(VIDEO, 'rb') as f:
        u = requests.post(f'https://rupload.facebook.com/video-upload/v21.0/{vid}', headers={'Authorization': f'OAuth {tok}', 'offset': '0', 'file_size': str(size)}, data=f, timeout=600).json()
    if not u.get('success'): raise RuntimeError(f'facebook upload: {u}')
    fin = requests.post(f'{G}/{pid}/video_reels', data={'upload_phase': 'finish', 'video_id': vid, 'video_state': 'PUBLISHED', 'description': caption, 'access_token': tok}, timeout=60).json()
    if not fin.get('success'): raise RuntimeError(f'facebook finish: {fin.get("error", fin)}')
    return {'url': f'https://www.facebook.com/reel/{vid}', 'id': vid}

def instagram():
    ig, tok = os.environ['IG_USER_ID'], os.environ['META_PAGE_TOKEN']
    c = requests.post(f'{G}/{ig}/media', data={'media_type': 'REELS', 'upload_type': 'resumable', 'caption': caption[:2200], 'share_to_feed': 'true', 'access_token': tok}, timeout=60).json()
    if 'id' not in c: raise RuntimeError(f'instagram container: {c.get("error", c)}')
    cid = c['id']
    with open(VIDEO, 'rb') as f:
        u = requests.post(c.get('uri') or f'https://rupload.facebook.com/ig-api-upload/v21.0/{cid}', headers={'Authorization': f'OAuth {tok}', 'offset': '0', 'file_size': str(size)}, data=f, timeout=600).json()
    if not u.get('success'): raise RuntimeError(f'instagram upload: {u}')
    for _ in range(60):
        st = requests.get(f'{G}/{cid}', params={'fields': 'status_code,status', 'access_token': tok}, timeout=30).json()
        if st.get('status_code') == 'FINISHED': break
        if st.get('status_code') == 'ERROR': raise RuntimeError(f'instagram processing: {st}')
        time.sleep(10)
    p = requests.post(f'{G}/{ig}/media_publish', data={'creation_id': cid, 'access_token': tok}, timeout=60).json()
    if 'id' not in p: raise RuntimeError(f'instagram publish: {p.get("error", p)}')
    link = requests.get(f'{G}/{p["id"]}', params={'fields': 'permalink', 'access_token': tok}, timeout=30).json().get('permalink')
    return {'url': link, 'id': p['id']}

NEEDS = {'youtube': ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN'], 'facebook': ['META_PAGE_ID', 'META_PAGE_TOKEN'], 'instagram': ['IG_USER_ID', 'META_PAGE_TOKEN']}
failed = 0
for name in want:
    if result.get(name, {}).get('url'): print(name, 'already posted'); continue
    missing = [k for k in NEEDS[name] if not os.environ.get(k)]
    if missing: result[name] = {'error': 'not connected: missing secret ' + ', '.join(missing)}; print(name, 'skipped:', result[name]['error']); continue
    try:
        result[name] = {**globals()[name](), 'at': datetime.datetime.utcnow().isoformat() + 'Z'}
        print(name, 'posted:', result[name]['url'])
    except Exception as e:
        failed += 1; result[name] = {'error': str(e)[:500]}; print(name, 'FAILED:', str(e)[:500])
json.dump(result, open(out_path, 'w'), indent=1)
sys.exit(1 if failed else 0)
