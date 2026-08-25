const GatewayDriver = require('./GatewayDriver');
const axios = require('axios');
const https = require('https');
const { decrypt } = require('../utils/cryptoHelper');

class UnifiDriver extends GatewayDriver {
    constructor(config) {
        super(config);
        this.baseURL = config?.controller_url?.replace(/\/+$/, '') || '';
        this.site = config?.controller_site || 'default';
        this.apiUser = config?.api_user || '';
        this.apiPass = decrypt(config?.api_pass) || '';

        this.client = axios.create({
            baseURL: this.baseURL,
            httpsAgent: new https.Agent({ rejectUnauthorized: !!config?.verify_tls }),
            withCredentials: true
        });
    }

    async login() {
        if (!this.baseURL) throw new Error('URL da controladora UniFi não informada.');
        const res = await this.client.post('/api/login', {
            username: this.apiUser,
            password: this.apiPass
        });
        return res.headers['set-cookie'];
    }

    async testConnection() {
        try {
            if (!this.baseURL) return { ok: false, vendor: 'unifi', msg: 'URL da controladora UniFi não informada.' };
            const cookies = await this.login();
            return { ok: !!cookies, vendor: 'unifi', msg: cookies ? 'Conexão com UniFi Controller realizada com sucesso!' : 'Falha na autenticação UniFi.' };
        } catch (err) {
            return { ok: false, vendor: 'unifi', msg: `Erro de conexão UniFi: ${err.message}` };
        }
    }

    async liberarAcesso(mac, ip, durationMinutes = 1440) {
        try {
            const cookies = await this.login();
            const cleanMac = mac.replace(/[:-]/g, ':').toLowerCase();

            const res = await this.client.post(
                `/api/s/${this.site}/cmd/stamgr`,
                { cmd: 'authorize-guest', mac: cleanMac, minutes: durationMinutes },
                { headers: { Cookie: cookies } }
            );

            return { ok: true, vendor: 'unifi', mac, durationMinutes, result: res.data };
        } catch (err) {
            console.error('[UnifiDriver] Erro ao liberar acesso:', err.message);
            return { ok: false, vendor: 'unifi', error: err.message };
        }
    }

    async removerAcesso(mac) {
        try {
            const cookies = await this.login();
            const cleanMac = mac.replace(/[:-]/g, ':').toLowerCase();

            const res = await this.client.post(
                `/api/s/${this.site}/cmd/stamgr`,
                { cmd: 'unauthorize-guest', mac: cleanMac },
                { headers: { Cookie: cookies } }
            );

            return { ok: true, vendor: 'unifi', mac, result: res.data };
        } catch (err) {
            return { ok: false, vendor: 'unifi', error: err.message };
        }
    }
}

module.exports = UnifiDriver;
