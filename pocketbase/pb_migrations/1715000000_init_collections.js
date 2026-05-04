/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Lister toutes les propriétés/méthodes accessibles sur app
  const props = []
  for (const key in app) {
    props.push(key + ':' + typeof app[key])
  }
  // Aussi tenter Object.keys
  try { props.push('KEYS:' + Object.keys(app).join(',')) } catch(e) {}
  throw new Error('APP_PROPS: ' + props.join('|'))
}, (_) => {})
