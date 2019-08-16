<template>
  <div id="app" class="app-inner">
    <div class="excel-list">
      <div class="excel-item excel-title">
        <span class="date">交易日期</span>
        <span class="pay">收/支</span>
        <span class="price">价格（元）</span>
        <span class="shop">交易对方</span>
        <span class="desc">商品详情</span>
      </div>
      <div class="excel-item" v-for="(item,index) in excelData" :key="index">
        <span class="date">{{item.date}}</span>
        <span class="pay">{{item.type}}</span>
        <span class="price">{{item.price}}</span>
        <span class="shop">{{item.shop}}</span>
        <span class="desc">{{item.desc}}</span>
      </div>
    </div>

    <div class="count-totle">
      <!-- 是否自定义选择 -->
      <button class="custom-but" @click="closeSelect()">{{!isCustom ? '开启' : '关闭'}}自定义选择</button>
      <button class="custom-but" v-if="isCustom" @click="confirmCustom()">确定</button>
      <button class="custom-but" @click="clearStorage()">清除缓存</button>
      <button class="custom-but" @click="deleteSamePrice()">删除相同的收入</button>
      
      <div class="price-list">
        <div class="price-item same-bill">
          <span class="cell">角色</span>
          <span class="cell">金额（元）</span>
        </div>
        <div class="price-item same-bill" v-for="(item,index) in sameBillList" :key="index">
          <span class="cell" :class="{'row-active':isCustom,'row-choose': item.isChoose,'row-tempChoose': item.isTempChoose}" @click="isCustom && chooseCustomItem(item)">{{item.name}}</span>
          <span class="cell">{{item.price}}</span>
        </div>
        <div class="price-item same-bill">
          <span class="cell">总额</span>
          <span class="cell count-price">{{allSamePrice}}</span>
        </div>
      </div>

      <!-- 价格列表 -->
      <div class="price-list">
        <div class="price-item">
          <span class="cell">角色</span>
          <span class="cell">金额（元）</span>
        </div>
        <div class="price-item" v-for="(item,index) in priceList" :key="index">
          <span class="cell">{{item.name}}</span>
          <span class="cell">{{item.value}}</span>
          <span class="delete" @click="deleteCustomItem(index)">删除</span>
        </div>
        <div class="price-item" >
          <span class="cell">总额</span>
          <span class="cell count-price">{{allCustomPrice}}</span>
        </div>
      </div>

      <select v-model="chartType">
        <option value="histogram">柱形图</option>
        <option value="pie">饼状图</option>
      </select>

      <div class="excel-chart">
        <ve-pie v-if="chartType == 'pie'" :data="chartData"></ve-pie>
        <ve-histogram v-if="chartType == 'histogram'" :data="chartData"></ve-histogram>
      </div>

      <!-- 支付宝账单 -->
      支付宝账单：<input type="file" @change="fileChange($event,'zhifubao')"/>

      <!-- 微信账单 -->
      微信账单：<input type="file" @change="fileChange($event,'weixin')"/>
    </div>
  </div>
</template>

<script>
import XLSX from "xlsx";
import { parse } from 'path';
import { isDate } from 'util';

export default {
  name: "app",
  data(){
    return{
      excelData: [],
      priceList: [], //选择的价格列表
      isCustom: false, //是否开启自定义选择
      sameBillList: [], //相同类型的账单list
      tempSelectItem: [], //临时选择对象


      chartType: 'pie', //默认饼状图

      chartData: {
        columns: ['类型', '金额'],
        rows: []
      }
    }
  },
  computed:{
    //获取自定义的总价格
    allCustomPrice(){
      let countPrice = 0;
      this.priceList.map(item=>{
        countPrice += item.value;
      })
      return countPrice;
    }, 

    //相同类型的总价格
    allSamePrice(){
      let countPrice = 0;
      this.sameBillList.map(item=>{
        countPrice += item.price;
      })
      return countPrice;
    },
  },
  methods: {
    //关闭选择
    closeSelect(){
      this.isCustom = !this.isCustom;

      //如果关闭选择，清除选择标记
      if(!this.isCustom){
        this.clearMark();
      }
    },

    //保存
    saveStorage(){
      //保留缓存
      localStorage.setItem('priceList',JSON.stringify(this.priceList));
      localStorage.setItem('sameBillList',JSON.stringify(this.sameBillList));
      localStorage.setItem('zhifubao',JSON.stringify(this.excelData));
    },

    //删除一个自定义元素
    deleteCustomItem(index){
      this.priceList.splice(index,1);
      this.saveStorage();
    },
    //清除缓存
    clearStorage(){
      localStorage.clear();
    },
    
    //选择
    chooseCustomItem(item) {
      //标注为临时选择
      this.$set(item,'isTempChoose',true);
      this.tempSelectItem.push(item);
    },

    //确认选择
    confirmCustom(){
      this.$prompt('请输入', '提示').then(({ value }) => {
        this.priceList.push({
          name: value,
          value: this.getTypePrice()
        })

        //设置饼状图
        this.setChart();

        //临时选择变为缓存标记
        this.sameBillList.map(item=>{
          if(item.isTempChoose){
            this.$set(item,'isChoose',true)
          }
        })

        //清除临时标记
        this.clearMark();

        //保留缓存
        this.saveStorage();
      })
    },
    
    //清除标记
    clearMark(){
      //临时选择变为缓存标记
      this.sameBillList.map(item=>{
        if(item.isTempChoose){
          this.$set(item,'isTempChoose',false)
        }
      })
    },

    //获取当前类型的价格
    getTypePrice(typeValue){
      let countPrice = 0;
      this.tempSelectItem.map(item=>{
        countPrice += item.price;
      })
      return countPrice;
    },

    //初始化数据
    initDate(res){
      for(let i = 0; i < res.length ; i++){
        let item = res[i];
        //英文代替中文
        for(let key in item){
          switch(true){
            case /金额/.test(key): this.$set(item,'price',parseInt(item[key]));break;
            case /商品/.test(key): this.$set(item,'desc',item[key]);break;
            case /收\/支/.test(key): this.$set(item,'type',item[key]);break;
            case /交易对方/.test(key): this.$set(item,'shop',item[key]);break;
            case /付款时间|交易时间/.test(key): this.$set(item,'date',this.computeData(item[key]));break;
            default:;break;
          }
        }
      }

      let differentList = [];

      if(!localStorage.getItem('sameBillList')){
        //获取过滤之后的数据
        res.map(item=>{
          if(item.type.indexOf('支出') == -1 || item.price == 0){
            return;
          }

          //第一次进入一个新类型
          if(differentList.indexOf(item.shop) == -1){
            differentList.push(item.shop);
            this.sameBillList.push({
              name: item.shop,
              price: item.price,
            })
          }
          //第二次进入一个新类型
          else{
            this.sameBillList.map(item1=>{
              if(item1.name == item.shop){
                this.$set(item1,'price',parseInt(item1.price) + parseInt(item.price))
              }
            })
          }
        })
        this.sameBillList.sort((a,b)=>{
          return b.price - a.price;
        })
      }else{
        this.sameBillList = JSON.parse(localStorage.getItem('sameBillList'))
      }

      this.excelData = this.excelData.concat(res);
    },

    //计算日期
    computeData(value){
      if(!value.toString().trim()) return;

      let date_1900 = new Date('1900-01-01');
      //-2的目的是，2019年1月1日，本身自带了1天，另外一天是excel的bug，1900年2月有29天，但实际是有28天
      date_1900.setDate(date_1900.getDate() + parseInt(value) - 2);

      return `${value,date_1900.getFullYear()}年${date_1900.getMonth() + 1}月${date_1900.getDate()}`;
    },

    //如果同一个平台的支出和收入相等的话，删除收入和支出
    deleteSamePrice(){
      let tempData = JSON.parse(JSON.stringify(this.excelData))
      tempData.map(item=>{
        if(item.type.indexOf('收入') != -1){
          for(let i = 0,isDelete = false; i < this.excelData.length ; isDelete ? i :i++){
            let item1 = this.excelData[i];
            if(item.price == item1.price && item.shop == item.shop1){
              isDelete = true;
              this.excelData.splice(i,1)
            }else{
              isDelete = false;
            }
          }
            
        }
      })
    },

    //设置饼状图
    setChart(){
      //设置饼状图的数据
      let tempRows = []

      this.priceList.map(item=>{
        tempRows.push({
          '类型': item.name,'金额': item.value
        })
      })
      this.$set(this.chartData,'rows',tempRows)
    },

    //文件改变
    fileChange(e,type) {
      let wb;
      let rABS = false;
      var f = e.target.files[0];
      var reader = new FileReader();
      reader.onload = function(e) {
        var data = e.target.result;
        wb = XLSX.read(data, {
          type: "binary"
        });
        
        //支付宝
        if(type == 'zhifubao'){
          localStorage.setItem('zhifubao',JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])))
        }
        //微信
        else{
          localStorage.setItem('weixin',JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])))
        }

        this.initDate(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
      }.bind(this);
      reader.readAsBinaryString(f);
    },

    fixdata(data) {
      //文件流转BinaryString
      var o = "",
        l = 0,
        w = 10240;
      for (; l < data.byteLength / w; ++l)
        o += String.fromCharCode.apply(
          null,
          new Uint8Array(data.slice(l * w, l * w + w))
        );
      o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w)));
      return o;
    },

  },
  mounted(){
    if(localStorage.getItem('zhifubao')){
      let weixin = JSON.parse(localStorage.getItem('weixin'))  
      let testData = JSON.parse(localStorage.getItem('zhifubao'))  
      testData = testData.concat(weixin)
      this.initDate(testData)
    }

    if(localStorage.getItem('priceList')){
      this.priceList = JSON.parse(localStorage.getItem('priceList'));
    }

    this.setChart();
  }
};
</script>

<style>
  #app {
    font-family: "Avenir", Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    margin: 60px 0px 0px 100px;
  }
  .app-inner{
    font-size: 0px;
  }
  .app-inner>div{
    font-size: 16px;
  }
  .excel-list{
    display: inline-block;
    width: 800px;
  }
  .excel-item{
    display: inline-block;
  }
  .excel-item:first-child{
    text-align: center;
  }
  .excel-item>.pay{
    width: 50px;
  }
  .excel-item>.price{
    width: 80px;
  }
  .excel-item>span{
    width: 100px;
    display: inline-block;
    text-align: left;
    padding: 5px 10px;
    border-left: 1px solid #8E8E8E;
    border-top: 1px solid #8E8E8E;
    min-height: 30px;
    line-height: 15px;
    font-size: 16px;
    vertical-align: middle;
  }
  .excel-item>span:last-child{
    border-right: 1px solid #8E8E8E;
  }
  .excel-item:last-child{
    border-bottom: 1px solid #8E8E8E;
  }
  .excel-item>.desc{
    width: 200px !important;
  }
  .excel-item>.shop{
    width: 200px !important;
  }


  .count-totle{
    display: inline-block;
    width: 650px;
    vertical-align: top;
  }

  .excel-chart{
    width: 400px;
    height: auto;
    display: inline-block;
  }

  /* 自定义选择 */
  .custom-but{
    margin-bottom: 50px;
  }
  .row-active{
    background: red;
    color: white;
    cursor: pointer;
  }
  .row-choose{
    background:#00FA9A;
    color: white;
  }
  .row-tempChoose{
    background: yellow;
    color: black;
  }

  /* 价格列表 */
  .price-list{
    margin-bottom: 50px;
  }
  .price-item{
    line-height: 30px;
  }
  .price-item:first-child{
    border-top: 1px solid #8E8E8E;
  }
  .price-item>.cell{
    display: inline-block;
    min-width: 100px;
    padding: 0px 10px;
    border-right: 1px solid #8E8E8E;
    border-bottom: 1px solid #8E8E8E;
  }
  .price-item>.cell:first-child{
    border-left: 1px solid #8E8E8E;
  }
  .price-item>.delete{
    cursor: pointer;
    color: red;
  }
  .count-price{
    font-weight: 600;
  }
  .same-bill>span{
    width: 300px;
  }
</style>
