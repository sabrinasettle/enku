export function countOutfits(categories) {
  return categories.reduce((total, items) => total * items.length, 1)
}
