const GatewayDriver = require('./GatewayDriver');
const axios = require('axios');
const https = require('https');
const { decrypt } = require('../utils/cryptoHelper');

class OmadaDriver extends GatewayDriver {
    constructor(config) {
        super(config);
        this.baseURL = config?.controller_url?.replace(/\/+$/, '') || '';
        this.omadacId = config?.omadac_id || '';
        this.site = config?.controller_site || 'default';
        this.apiUser = config?.api_user || '';
        this.apiPass = decrypt(config?.api_pass) || '';

        this.client = axios.create({
            baseURL: this.baseURL,
            httpsAgent: new https.Agent({ rejectUnauthorized: !!config?.verify_tls })
        });
    }

    async login() {
        if (!this.baseURL) throw new Error('URL da controladora Omada não informada.');
        const url = `${this.baseURL}/${this.omadacId}/api/v2/login`;
        const res = await this.client.post(url, {
            username: this.apiUser,
            password: this.apiPass
        });
        return res.data?.result?.token;
    }

    async testConnection() {
        try {
            if (!this.baseURL) return { ok: false, vendor: 'omada', msg: 'URL da controladora Omada não informada.' };
            const token = await this.login();
            return { ok: !!token, vendor: 'omada', msg: token ? 'Conexão com Omada Controller realizada com sucesso!' : 'Falha na autenticação Omada.' };
        } catch (err) {
            return { ok: false, vendor: 'omada', msg: `Erro de conexão Omada: ${err.message}` };
        }
    }

    async liberarAcesso(mac, ip, durationMinutes = 1440) {
        try {
            const token = await this.login();
            if (!token) throw new Error('Não foi possível autenticar na controladora Omada');

            const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
            const url = `${this.baseURL}/${this.omadacId}/api/v2/sites/${this.site}/cmd/auth`;

            await this.client.post(url, {
                mac: cleanMac,
                duration: durationMinutes
            }, {
                headers: { 'Csrf-Token': token }
            });

            return { ok: true, vendor: 'omada', mac, durationMinutes };
        } catch (err) {
            console.error('[OmadaDriver] Erro ao liberar acesso:', err.message);
            return { ok: false, vendor: 'omada', error: err.message };
        }
    }

    async removerAcesso(mac) {
        try {
            const token = await this.login();
            if (!token) throw new Error('Não foi possível autenticar na controladora Omada');

            const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
            const url = `${this.baseURL}/${this.omadacId}/api/v2/sites/${this.site}/cmd/unauth`;

            await this.client.post(url, { mac: cleanMac }, {
                headers: { 'Csrf-Token': token }
            });

            return { ok: true, vendor: 'omada', mac };
        } catch (err) {
            return { ok: false, vendor: 'omada', error: err.message };
        }
    }
}

module.exports = OmadaDriver;
