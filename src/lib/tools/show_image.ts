import type { StateContext } from '../domain/engine';

export const id = 'display_image';
export const desc = 'Affiche une image à partir de state.imageUrl ou state.url (par défaut : photo de chien aléatoire).';

export function exec(state: StateContext) {
  const url = (state.imageUrl || state.url || '').trim();

  if (!url) {
    return {
      imageUrl: null,
      status: 'error',
      message: 'Aucune URL fournie (state.imageUrl ou state.url).',
    };
  }

  // Si l'URL n'est pas une image directe, on tente de résoudre une API qui
  // expose l'image via { message } (ex : dog.ceo) ou { url } / { image }.
  if (/^https?:\/\//i.test(url) && !/\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(url)) {
    return fetch(url)
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error(`Erreur HTTP: ${response.status}`)),
      )
      .then((data) => ({
        imageUrl: data && (data.message || data.url || data.image || null),
        status: 'ok',
      }))
      .catch((error) => ({
        imageUrl: null,
        status: 'error',
        message: error.message,
      }));
  }

  return { imageUrl: url, status: 'ok' };
}