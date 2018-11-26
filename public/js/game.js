requirejs.config({
    baseUrl: 'js/lib',
    paths: {
        app: 'app'
    }
});

requirejs(
    ['/primus/primus.js', 'm', 'window'],
    function(Primus, m, window) {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('game');

        const primus = Primus.connect('/?game='+gameId);

        const state = {
            token: null,
            game: null
        };

        primus.on('data', function(gameData) {
            if (gameData.type === 'gameState') {
                state.game = gameData.game
                m.redraw();
            } else if (gameData.type === 'token') {
                state.token = gameData.token;
                m.redraw();
            }
        });

        m.mount(document.getElementById('root'), {
            view: function() {
                if (!state.game) {
                    return m('div',
                        m('h1', 'no game')
                    );
                }

                console.log(state);

                return m('div', [
                    m('h1', state.game.id + ' - ' + state.game.name + '-' + state.token),
                    m('div', (state.game.state.users || []).map(function(user) {
                        return m('div', user.name);
                    })),
                    m('button', { onclick: function() {
                        console.log('=>>', state.token);
                            m.request({
                                method: "POST",
                                url: "/action",
                                data: {
                                    token: state.token,
                                    type: 'setName',
                                    data: {
                                        name: 'fritz'
                                    }
                                }
                            })
                            .then(function(result) {
                                console.log(result)
                            })
                    }}, 'push')
                ]);
            }
        });
    }
);
