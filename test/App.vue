<template>
<div>
  <span class="bbb">123</span>
  {{aaa}}
  <span>123</span>
</div>
</template>

<script>
module.exports.default = Vue.extend({
  data () {
    return {
      aaa: 1
    }
  }
})
</script>

<style scoped>
.bbb {
  margin: 0;
  color: red;
}
</style>
