#!/usr/bin/env python3
import sys
import os
import urllib.request

def download_art(url):
    if not url or url.strip() == '' or url == 'null':
        return None
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            return r.read()
    except Exception as e:
        print(f"[tagger] Art download failed: {e}", file=sys.stderr)
        return None

def tag_mp3(filepath, artist, title, album, art_data):
    from mutagen.id3 import ID3, TIT2, TPE1, TALB, APIC, ID3NoHeaderError
    try:
        tags = ID3(filepath)
    except ID3NoHeaderError:
        tags = ID3()
    tags.clear()
    tags.add(TIT2(encoding=3, text=title))
    tags.add(TPE1(encoding=3, text=artist))
    if album:
        tags.add(TALB(encoding=3, text=album))
    if art_data:
        tags.add(APIC(encoding=3, mime='image/jpeg', type=3, desc='Cover', data=art_data))
    tags.save(filepath)

def tag_flac(filepath, artist, title, album, art_data):
    from mutagen.flac import FLAC, Picture
    audio = FLAC(filepath)
    audio.clear()
    audio['artist'] = artist
    audio['title'] = title
    if album:
        audio['album'] = album
    if art_data:
        pic = Picture()
        pic.type = 3
        pic.mime = 'image/jpeg'
        pic.data = art_data
        audio.add_picture(pic)
    audio.save()

def tag_m4a(filepath, artist, title, album, art_data):
    from mutagen.mp4 import MP4, MP4Cover
    audio = MP4(filepath)
    audio.clear()
    audio['\xa9nam'] = [title]
    audio['\xa9ART'] = [artist]
    if album:
        audio['\xa9alb'] = [album]
    if art_data:
        audio['covr'] = [MP4Cover(art_data, imageformat=MP4Cover.FORMAT_JPEG)]
    audio.save()

def tag_opus(filepath, artist, title, album, art_data):
    from mutagen.oggvorbis import OggVorbis
    audio = OggVorbis(filepath)
    audio.clear()
    audio['artist'] = [artist]
    audio['title'] = [title]
    if album:
        audio['album'] = [album]
    audio.save()

def tag_file(filepath, artist, title, album, album_art_url):
    ext = os.path.splitext(filepath)[1].lower()
    art_data = download_art(album_art_url)
    try:
        if ext == '.mp3':
            tag_mp3(filepath, artist, title, album, art_data)
        elif ext == '.flac':
            tag_flac(filepath, artist, title, album, art_data)
        elif ext in ['.m4a', '.mp4']:
            tag_m4a(filepath, artist, title, album, art_data)
        elif ext == '.opus':
            tag_opus(filepath, artist, title, album, art_data)
        else:
            print(f"[tagger] Unsupported format: {ext}", file=sys.stderr)
            return False
        print(f"[tagger] Tagged: {filepath}")
        return True
    except Exception as e:
        print(f"[tagger] Error: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: tagger.py <filepath> <artist> <title> [album] [album_art_url]")
        sys.exit(1)
    filepath = sys.argv[1]
    artist = sys.argv[2]
    title = sys.argv[3]
    album = sys.argv[4] if len(sys.argv) > 4 else None
    album_art_url = sys.argv[5] if len(sys.argv) > 5 else None
    if album in ('null', ''):
        album = None
    if album_art_url in ('null', ''):
        album_art_url = None
    sys.exit(0 if tag_file(filepath, artist, title, album, album_art_url) else 1)
