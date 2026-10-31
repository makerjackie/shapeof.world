"""Tones the public-domain archive images (public/archive/, listed in SOURCES.json) into public/img/.

usage: ~/.venvs/shapeof-films/bin/python tools/assets.py

Photographs become a warm duotone (ink brown → parchment) so the whole film reads as one old album. Paintings keep their
colour but are pulled warmer and a little darker. Archive files stay out of Git; SOURCES.json records each file's
Commons page and licence (all public domain, the Beijing stele photo CC0).
"""
import os

from PIL import Image, ImageEnhance, ImageOps

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "archive")
DST = os.path.join(ROOT, "public", "img")
os.makedirs(DST, exist_ok=True)


def photo(name, out, w, crop=None, contrast=1.15):
    im = Image.open(os.path.join(SRC, name + ".jpg")).convert("L")
    if crop:
        im = im.crop(crop)
    im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    im = ImageOps.autocontrast(im, cutoff=0.5)
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageOps.colorize(im, black=(14, 10, 7), white=(246, 226, 190), mid=(132, 98, 62))
    im.save(os.path.join(DST, out + ".jpg"), quality=92)
    print(out, im.size)


def painting(name, out, w=None, crop=None, sat=0.75, bright=0.9):
    im = Image.open(os.path.join(SRC, name + ".jpg")).convert("RGB")
    if crop:
        im = im.crop(crop)
    if w:
        im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Brightness(im).enhance(bright)
    r, g, b = im.split()
    r = r.point(lambda v: min(255, int(v * 1.04)))
    b = b.point(lambda v: int(v * 0.88))
    Image.merge("RGB", (r, g, b)).save(os.path.join(DST, out + ".jpg"), quality=90)
    print(out, im.size)


photo("vand-portrait", "vand", 900)
photo("rock-portrait", "rock", 900)
photo("cv2-lc", "cv2", 1800)
photo("row-1890", "row", 1800)
photo("samurai", "samurai", 1100)
photo("nelson", "nelson", 900, crop=(300, 0, 1930, 1900))
photo("jay", "jay", 900)
photo("stele", "stele", 2200, contrast=1.05)
painting("florence", "florence", 2000)
painting("school", "school", 2400)
# 姑苏繁华图: the walled city and canals (second quarter of the scroll), at full height for a slow pan
painting("suzhou-full", "suzhou", crop=(8800, 0, 17700, 1010), sat=0.8, bright=0.92)
