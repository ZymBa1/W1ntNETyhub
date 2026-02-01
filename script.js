// НАСТРОЙКИ SUPABASE
const SUPABASE_URL = 'https://elponebrjsljcrgdmjko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscG9uZWJyanNsamNyZ2RtamtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDY2OTMsImV4cCI6MjA4NTUyMjY5M30.w94jq-nk3YHm03KClgHHXd_ermXNx23swQE8SJW_7Jk';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ ТЕЛЕГРАМА
window.onTelegramAuth = async function(user) {
    console.log("Данные из Telegram:", user);

    try {
        // Логика "Бота": Проверяем/Создаем аккаунт в БД
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .upsert({ 
                id: user.id, 
                username: user.username || user.first_name, 
                avatar_url: user.photo_url 
            })
            .select()
            .single();

        if (error) throw error;

        // Сохраняем сессию и запускаем приложение
        localStorage.setItem('w1nt_user', JSON.stringify(profile));
        initApp(profile);

    } catch (err) {
        console.error("Ошибка авторизации:", err.message);
        alert("Ошибка входа. Проверьте консоль F12.");
    }
};

function initApp(user) {
    window.currentUser = user;
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // Проверка на админа
    if (user.is_admin) {
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('admin-badge').style.display = 'block';
    }

    loadFeed();
}

// ЗАГРУЗКА ЛЕНТЫ (Популярное + Новое)
async function loadFeed() {
    const feedList = document.getElementById('feed-list');
    feedList.innerHTML = '<div class="loader">Загрузка ленты...</div>';

    const { data: popular } = await supabaseClient.from('posts').select('*, profiles(*)').eq('is_popular', true).limit(5);
    const { data: recent } = await supabaseClient.from('posts').select('*, profiles(*)').order('created_at', {ascending: false}).limit(10);

    feedList.innerHTML = '';
    const max = Math.max(popular?.length || 0, recent?.length || 0);

    for (let i = 0; i < max; i++) {
        if (popular?.[i]) renderPost(popular[i], "🔥 Популярное");
        if (recent?.[i]) renderPost(recent[i], "🕒 Новое");
    }
}

// ... внутри функции renderPost ...
function renderPost(post, label) {
    const feed = document.getElementById('feed-list');
    // Теперь просто verify.png
    const hasVerify = post.profiles.is_verified ? `<img src="verify.png" class="verify-img">` : '';
    const postImg = post.image_url ? `<img src="${post.image_url}" class="post-media">` : '';

    feed.innerHTML += `
        <div class="post-card">
            <div class="post-header">
                <img src="${post.profiles.avatar_url}" class="user-av">
                <div class="user-meta">
                    <strong>${post.profiles.username}</strong> ${hasVerify}
                </div>
            </div>
            <div class="post-content">${post.content}</div>
            ${postImg}
        </div>
    `;
}

// СОЗДАНИЕ ПОСТА С ФОТО
async function createPost() {
    const text = document.getElementById('post-text').value;
    const fileInput = document.getElementById('post-img');
    const file = fileInput.files[0];
    let imageUrl = null;

    if (!text && !file) return;

    if (file) {
        const fileName = `${Date.now()}_post.png`;
        const { data } = await supabaseClient.storage.from('post-images').upload(fileName, file);
        if (data) {
            imageUrl = supabaseClient.storage.from('post-images').getPublicUrl(fileName).data.publicUrl;
        }
    }

    await supabaseClient.from('posts').insert([{
        author_id: currentUser.id,
        content: text,
        image_url: imageUrl
    }]);

    document.getElementById('post-text').value = '';
    fileInput.value = '';
    loadFeed();
}

// Проверка сессии при загрузке страницы
window.onload = () => {
    const saved = localStorage.getItem('w1nt_user');
    if (saved) initApp(JSON.parse(saved));
};
