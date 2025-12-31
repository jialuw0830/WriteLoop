import { createRouter, createWebHistory } from 'vue-router';
import Editor from '../components/Editor.vue';
import GenerateTasks from '../components/GenerateTasks.vue';
import EssayList from '../components/EssayList.vue';
import EssayDetail from '../components/EssayDetail.vue';
import Login from '../components/Login.vue';
import Profile from '../components/Profile.vue';
import { useAuth } from '../composables/useAuth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'Editor',
      component: Editor,
      meta: { requiresAuth: true },
    },
    {
      path: '/generate-tasks',
      name: 'GenerateTasks',
      component: GenerateTasks,
      props: (route) => ({ text: route.query.text || '' }),
      meta: { requiresAuth: true },
    },
    {
      path: '/essays',
      name: 'EssayList',
      component: EssayList,
      meta: { requiresAuth: true },
    },
    {
      path: '/essays/:id',
      name: 'EssayDetail',
      component: EssayDetail,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: Profile,
      meta: { requiresAuth: true },
    },
  ],
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  const { isAuthenticated } = useAuth();
  
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    // 需要登录但未登录，跳转到登录页
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.name === 'Login' && isAuthenticated.value) {
    // 已登录访问登录页，跳转到首页
    next('/');
  } else {
    next();
  }
});

export default router;
