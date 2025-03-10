"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.getKubeconfig = exports.getAKSKubeconfig = void 0;
const core = require("@actions/core");
const path = require("path");
const fs = require("fs");
const http_1 = require("@azure-actions/utilities/lib/http");
const auth_1 = require("@azure-actions/auth");
function getAKSKubeconfig(azureSessionToken, subscriptionId, managementEndpointUrl) {
    const resourceGroupName = core.getInput('resource-group', { required: true });
    const clusterName = core.getInput('cluster-name', { required: true });
    return new Promise((resolve, reject) => {
        var webRequest = new http_1.WebRequest();
        webRequest.method = 'GET';
        webRequest.uri = `${managementEndpointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/${clusterName}/accessProfiles/clusterAdmin?api-version=2017-08-31`;
        webRequest.headers = {
            'Authorization': 'Bearer ' + azureSessionToken,
            'Content-Type': 'application/json; charset=utf-8'
        };
        http_1.sendRequest(webRequest).then((response) => {
            const accessProfile = response.body;
            if (accessProfile.properties && accessProfile.properties.kubeConfig) {
                var kubeconfig = Buffer.from(accessProfile.properties.kubeConfig, 'base64');
                resolve(kubeconfig.toString());
            }
            else {
                reject(JSON.stringify(response.body));
            }
        }).catch(reject);
    });
}
exports.getAKSKubeconfig = getAKSKubeconfig;
function getKubeconfig() {
    return __awaiter(this, void 0, void 0, function* () {
        const creds = core.getInput('creds', { required: true });
        let credsObject;
        try {
            credsObject = JSON.parse(creds);
        }
        catch (ex) {
            throw new Error('Credentials object is not a valid JSON');
        }
        const managementEndpointUrl = credsObject["resourceManagerEndpointUrl"] || "https://management.azure.com/";
        const subscriptionId = core.getInput('subscription-id') || credsObject["subscriptionId"];
        const azureSessionToken = yield auth_1.getAzureAccessToken(creds);
        const kubeconfig = yield getAKSKubeconfig(azureSessionToken, subscriptionId, managementEndpointUrl);
        return kubeconfig;
    });
}
exports.getKubeconfig = getKubeconfig;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const kubeconfig = yield getKubeconfig();
        const runnerTempDirectory = process.env['RUNNER_TEMP']; // Using process.env until the core libs are updated
        const kubeconfigPath = path.join(runnerTempDirectory, `kubeconfig_${Date.now()}`);
        core.debug(`Writing kubeconfig contents to ${kubeconfigPath}`);
        fs.writeFileSync(kubeconfigPath, kubeconfig);
        fs.chmodSync(kubeconfigPath, '600');
        core.exportVariable('KUBECONFIG', kubeconfigPath);
        core.debug('KUBECONFIG environment variable is set');
    });
}
exports.run = run;
run().catch(core.setFailed);
