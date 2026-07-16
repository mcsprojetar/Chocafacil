// Service Worker do ChocaFácil — permite que o app abra e funcione mesmo sem internet.
//
// IMPORTANTE PARA ATUALIZAÇÕES FUTURAS:
// Sempre que você atualizar o index.html no GitHub, também troque o número
// abaixo (CACHE_NAME), por exemplo de 'v1' para 'v2'. Isso força o aplicativo
// a baixar a versão nova em vez de continuar usando a versão antiga guardada.
const CACHE_NAME = 'chocafacil-cache-v1';

const ARQUIVOS_ESSENCIAIS = [
    './',
    './index.html',
    './icon-192.png',
    './icon-512.png'
];

// Ao instalar, guarda os arquivos essenciais do próprio app (não trava se falhar).
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
            .catch((erro) => console.error('ChocaFácil SW: falha ao preparar cache inicial', erro))
    );
    self.skipWaiting();
});

// Ao ativar, apaga versões antigas de cache que não são mais usadas.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((nomes) =>
            Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const ehNavegacaoDoApp = event.request.mode === 'navigate';

    if (ehNavegacaoDoApp) {
        // Página principal: tenta buscar a versão mais nova da internet primeiro
        // (assim, atualizações aparecem automaticamente quando há conexão).
        // Se não houver internet, usa a última versão salva.
        event.respondWith(
            fetch(event.request)
                .then((respostaRede) => {
                    const copia = respostaRede.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
                    return respostaRede;
                })
                .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
        );
        return;
    }

    // Demais recursos (ícones, Font Awesome, Chart.js, jsPDF): usa o que já
    // estiver salvo primeiro (mais rápido), e atualiza o cache em segundo
    // plano quando há internet.
    event.respondWith(
        caches.match(event.request).then((respostaCache) => {
            const buscaRede = fetch(event.request)
                .then((respostaRede) => {
                    if (respostaRede && respostaRede.status === 200) {
                        const copia = respostaRede.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
                    }
                    return respostaRede;
                })
                .catch(() => respostaCache);
            return respostaCache || buscaRede;
        })
    );
});
