// Страница «Альбом»: галерея работ с переключением фотографий.

import { qs } from '../utils/dom.js';
import { Slider } from '../components/slider.js';
import { GALLERY_IMAGES } from '../config.js';
import { initHeader } from '../components/header.js';

initHeader();

new Slider(qs('#slider'), GALLERY_IMAGES);
