import type { StateContext } from '../domain/engine';

export const id = 'api_request';
export const desc = 'Effectue une requête HTTP dynamique (GET, POST, PUT, DELETE)';

export function exec(state: StateContext) {
  const userId = state.userId || 1;
  const url = state.url || `https://jsonplaceholder.typicode.com/users/${userId}`;

  // Par défaut, on utilise GET. On force en majuscules pour éviter les erreurs.
  const method = (state.method || 'GET').toUpperCase();

  // On prépare l'objet d'options de base
  const options: any = {
    method: method,
    headers: state.headers || {} // Permet de passer des headers custom via le state si besoin
  };

  // On n'ajoute le Content-Type et le body QUE si ce n'est pas un GET ou HEAD
  if (method !== 'GET' && method !== 'HEAD') {
    options.headers['Content-Type'] = 'application/json';

    // On utilise state.payload (ou body) s'il existe, sinon on envoie un objet vide
    options.body = JSON.stringify(state.payload || {});
  }

  return fetch(url, options)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Astuce : un DELETE ou un PUT renvoie parfois un statut 204 (No Content) sans body JSON.
      // Tenter un response.json() sur un 204 ferait planter le code.
      if (response.status === 204) {
        return { success: true, status: 204, message: "Requête exécutée avec succès (No Content)" };
      }

      return response.json().then(data => {
        return data; // Retourne directement les données au StateStore
      });
    })
    .catch(error => {
      return {
        success: false,
        message: error.message
      };
    });
}
