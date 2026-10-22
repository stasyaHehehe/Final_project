// Слайдер фотографий для «Галереи работ» 


import { el } from '../utils/dom.js';

export class Slider {
  #images;
  #slides = [];
  #index = 0;
  #root;
  #counter;
  #touchStartX = null;

  /**
   * @param {HTMLElement} root 
   * @param {{src: string, alt: string}[]} images
   */
  constructor(root, images) {
    this.#root = root;
    this.#images = images;
    this.#build();
    this.#bind();
    this.#show(0);
  }

  get index() {
    return this.#index;
  }

  next() {
    this.#show(this.#index + 1);
  }

  prev() {
    this.#show(this.#index - 1);
  }

  #build() {
    const stage = this.#root.querySelector('[data-slider-stage]');
    this.#slides = this.#images.map(({ src, alt }, i) => el('img', {
      class: 'slider__image',
      attrs: { src, alt, draggable: 'false', loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' },
    }));
    this.#counter = el('p', { class: 'slider__counter', attrs: { 'aria-live': 'polite' } });
    stage.append(...this.#slides, this.#counter);
  }

  #bind() {
    this.#root.querySelector('[data-slider-prev]').addEventListener('click', () => this.prev());
    this.#root.querySelector('[data-slider-next]').addEventListener('click', () => this.next());

    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') this.prev();
      if (event.key === 'ArrowRight') this.next();
    });

    const stage = this.#root.querySelector('[data-slider-stage]');
    stage.addEventListener('touchstart', (event) => {
      this.#touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    stage.addEventListener('touchend', (event) => {
      if (this.#touchStartX === null) return;
      const delta = event.changedTouches[0].clientX - this.#touchStartX;
      this.#touchStartX = null;
      if (Math.abs(delta) > 40) (delta < 0 ? this.next() : this.prev());
    });
  }

  #show(index) {
    const total = this.#slides.length;
    this.#index = (index + total) % total; // по кругу
    this.#slides.forEach((slide, i) => slide.classList.toggle('is-active', i === this.#index));
    this.#counter.textContent = `${this.#index + 1} / ${total}`;
  }
}
