export const Config = {
    environments: {
        local: {
            BASE_URL: 'http://localhost:3000',
            VIRTUAL_USERS: 50,
            DURATION: '10m',
        },
        production: {
            BASE_URL: 'https://www.warriortournaments.ie',
            VIRTUAL_USERS: 500,
            DURATION: '60m',
        },
    },

    getConfig: (env = 'local') => {
        return Config.environments[env];
    },

    getStages: (env = 'local') => {
        const config = Config.getConfig(env);
        const users = config.VIRTUAL_USERS;

        return [
            { duration: '30s', target: Math.floor(users * 0.1) },
            { duration: '1m', target: Math.floor(users * 0.5) },
            { duration: '2m', target: users },
            { duration: config.DURATION, target: users },
            { duration: '1m', target: 0 },
        ];
    },
};