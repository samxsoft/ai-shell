import { createApp } from "vue";
import "./index.css";
import App from "./App.vue";

// 全局彻底禁止 WebView 默认网页右键菜单，统一使用原生自定义上下文菜单
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

createApp(App).mount("#app");



