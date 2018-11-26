requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        app: 'app'
    }
});

requirejs(
    ['/primus/primus.js', 'm', 'window'],
    function(Primus, m, window) {
        const primus = Primus.connect('/');

        primus.on('data', function(data) {
            m.mount(document.getElementById('root'), {
                view: function() {
                    return m('div',
                        m('h1', 'hello'),
                        m('div',
                            data.games.map(function(game) {
                                return m('a', { href: '/game.html?game='+game.id }, game.id)
                            })
                        )
                    );
                }
            });
        });
    }
);
