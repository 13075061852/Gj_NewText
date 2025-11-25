export const initTheme = () => {
    const toggleBtn = document.getElementById('theme-toggle');
    
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const applyTheme = (isDark) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };


    if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
        applyTheme(true);
    } else {
        applyTheme(false);
    }

    toggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        applyTheme(!isDark);
        localStorage.setItem('theme', !isDark ? 'dark' : 'light');
    });
    

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches);
        }
    });
};
