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
        const state = {
            games: [],
            selectedProfile: null,
        };

        const profiles = JSON.parse(localStorage.getItem('profiles')) || [];

        const App = {
            view: function() {
                return m('div',
                    m('h1', 'hello'),
                    m('a', { href: '/profiles', oncreate: m.route.link, onupdate: m.route.link }, 'profiles'),
                    m('select', ([ {} ]).concat(profiles).map(function(profile) {
                        return m('option', {
                            value: profile.name,
                            onclick: function() {
                                state.selectedProfile = profile.name;
                            }
                        }, profile.name);
                    })),
                    m('div',
                        state.games.map(function(game) {
                            if (!state.selectedProfile) {
                                return m('span', game.id);
                            }

                            return m('a', { href: '/game.html?game='+game.id+'&profile='+state.selectedProfile }, game.id)
                        })
                    )
                );
            }
        };

        const Profiles = {
            view: function() {
                const profiles = JSON.parse(localStorage.getItem('profiles')) || [];

                return m('div',
                    m('h1', 'Profiles'),
                    m('a', { href: '/', oncreate: m.route.link, onupdate: m.route.link }, 'back'),
                    m('div', profiles.map(function(profile) {
                        return m('div', [
                            profile.name,
                            m('input', { type: 'button', onclick: function() {
                                const loadedProfiles = JSON.parse(localStorage.getItem('profiles'));

                                const profiles = loadedProfiles.find ? loadedProfiles : [];

                                localStorage.setItem('profiles', JSON.stringify(profiles.filter(function(entry) {
                                    return entry.name != profile.name;
                                })));
                                m.redraw();
                            }, value: 'delete' })
                        ]);
                    })),
                    m('div', [
                        m('input#profileName', { placeholder: 'profilename' }),
                        m('input', { type: 'button', value: 'create',
                            onclick: function() {
                                const profile = {
                                    name: document.querySelector('#profileName').value,
                                    token: String(Math.random()).replace('.', '')
                                };

                                const loadedProfiles = JSON.parse(localStorage.getItem('profiles'));

                                const profiles = loadedProfiles.find ? loadedProfiles : [];

                                if (!profile.name || profiles.find(function(entry) { return entry.name === profile.name })) {
                                    return;
                                }
                                else {
                                    profiles.push(profile);
                                    localStorage.setItem('profiles', JSON.stringify(profiles));
                                    m.redraw();
                                }
                            }
                        })
                    ])
                );
            }
        };

        primus.on('data', function(data) {
            state.games = data.games;
            m.mount(document.getElementById('root'), App);
            m.route(document.getElementById('root'), '/', {
                '/': App,
                '/profiles': Profiles
            })
        });
    }
);
