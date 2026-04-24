import type { StateContext } from '../domain/engine';

export const id = 'add_one';
export const desc = 'Incrémente state.count de 1';

// C'est maintenant une vraie fonction typée !
export function exec(state: StateContext) {
  return (state.count || 0) + 1;
}
