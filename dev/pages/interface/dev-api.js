export default {
  list: './data/list.json',
  detail: function(id) {
    return 'data/detail_' + id + '.json'
  }
}