// 主题切换功能
document.addEventListener('DOMContentLoaded', function () {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const appContainer = document.querySelector('.app-container');

    // 从本地存储中获取主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        htmlElement.setAttribute('data-theme', savedTheme);
    } else {
        // 检测系统主题偏好
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDarkMode) {
            htmlElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    }

    // 切换主题
    themeToggle.addEventListener('click', function () {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // 添加过渡动画
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    });

    // 侧边栏收起/展开功能
    const savedSidebarState = localStorage.getItem('sidebarCollapsed');

    if (savedSidebarState === 'true') {
        appContainer.classList.add('sidebar-collapsed');
    }

    sidebarToggle.addEventListener('click', function () {
        appContainer.classList.toggle('sidebar-collapsed');

        // 保存侧边栏状态到本地存储
        const isCollapsed = appContainer.classList.contains('sidebar-collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    });

    // 在小屏幕上自动收起侧边栏
    const checkScreenSize = function () {
        if (window.innerWidth <= 768) {
            appContainer.classList.add('sidebar-collapsed');
        }
    };

    // 初始检查屏幕尺寸
    checkScreenSize();

    // 监听窗口大小变化
    window.addEventListener('resize', checkScreenSize);

    // 当点击页面内容时，在小屏幕上自动收起侧边栏
    const contentContainer = document.querySelector('.content-container');
    contentContainer.addEventListener('click', function () {
        if (window.innerWidth <= 768) {
            appContainer.classList.add('sidebar-collapsed');
        }
    });
});