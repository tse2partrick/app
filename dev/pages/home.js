import html from './home.html' //该路径是相对于home.js的，不能忽略./，否则在rollup.js打包时会出错
import '../mycomponents/appbar.js'
import '../components/body.js'
import '../vendors/axios.min.js'
import '../vendors/jroll-vue-infinite.js'
import api from './interface/api.js'


export default {
  template: html,
  components: {
    'jroll-infinite': JRoll.VueInfinite({
      bottomed: function() {
        const parent = this.$parent;
        const me = this;
        //this.tip = '没有更多数据！！！';
        if(this.page < (this.total || 1)){
          axios.get(api.list + '?page=' + (this.page + 1)).then(function(res){
            if(res.data.msg === 'success'){
              me.page++;
              me.total = res.data.total;
              parent.items = parent.items.concat(res.data.result);
               if(me.page === res.data.total){
                 me.tip = '没有更多数据啦!';
               }
            }
          })
        }
      }
    }, {
      scrollBarY: true
    })
  },
  data: function () {
    return {
      items: []
    }
  },
  methods: {
    gotoDetail: function(id) {
      this.go('pages/detail?id=' + id);
    }
  }
}