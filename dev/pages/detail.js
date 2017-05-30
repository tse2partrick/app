/* global axios */ 
import html from './detail.html'
import '../components/button.js'
import '../vendors/axios.min.js'
import api from './interface/api.js'
import footer from '../mycomponents/footer.js'

export default {
  components: {
    'myFooter': footer
  },
  template: html,
  data: function() {
    return {
      detail: ''
    };
  },
  beforeEnter: function(cb) {
    cb(function () {
      this.detail = {};
      if(this.$refs.jbody.jroll){
        this.$refs.jbody.jroll.scrollTo(0, 0);
      }
    });
  },
  afterEnter: function(params) {
    if (!params) return;

    var me = this;
    axios.get(api.detail(params.id)).then(function(res){
      if(res.data.msg === 'success'){
        me.detail = res.data.result
      }
    })
  },
  methods: {
    goBack:function() {
      this.go(-1);
    }
  }
}