// leaflet.markercluster si aggancia all'oggetto globale `L`: questo modulo lo espone prima
// che il plugin venga importato (gli import si valutano nell'ordine in cui sono scritti).
import L from 'leaflet'

window.L = L
export default L
