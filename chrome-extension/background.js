const targetTabs = {};

chrome.contextMenus.create({
	title: 'ページをHTMLとして表示',
	onclick: (info, tab) => {
		const tabId = tab.id;
		chrome.permissions.request({
			origins: [
				tab.url,
			],
		}, granted => {
			if (granted) {
				startListenerIfNeeded();
				targetTabs[tabId] = {
					url: tab.url,
				};
				chrome.tabs.reload(tabId);
			}
		});
	},
});

chrome.tabs.onRemoved.addListener(tabId => {
	delete targetTabs[tabId];
});


const isTargetRequest = (details, ext) => {
	const targetTab = targetTabs[details.tabId];
	if (!targetTab) return false;
	if (ext === 'html') {
		return targetTab.url === details.url;
	} else {
		return true;
	}
};

const extToContentType = {
	'html': 'text/html',
	'css': 'text/css',
	'js': 'application/javascript',
};

const callback = (details) => {
	const url = new URL(details.url);
	const ext = url.pathname.match(/[.]([^.]+)$/) ? RegExp.$1 : null;
	if (!isTargetRequest(details, ext)) return;
	if (ext in extToContentType) {
		const contentType = extToContentType[ext];
		const responseHeaders = details.responseHeaders;
		const contentTypeHeader = responseHeaders.find(header => header.name.toLowerCase() === 'content-type');
		if (contentTypeHeader) {
			const value = contentTypeHeader.value;
			contentTypeHeader.value = value.replace(/^text\/plain;/g, `${contentType};`);
			return {
				responseHeaders,
			};
		}
	}
};
const filter = {
	urls: [
		'*://*/*.html*',
		'*://*/*.css*',
		'*://*/*.js*',
	],
};
const opt_extraInfoSpec = [
	'blocking',
	'responseHeaders',
];

/**
 * host permission が1つも許可されていない場合例外が発生してしまうため、関数化してhost permissionが許可された後に実行する
 */
const startListenerIfNeeded = () => {
	if (chrome.webRequest.onHeadersReceived.hasListener(callback)) return;
	chrome.webRequest.onHeadersReceived.addListener(callback, filter, opt_extraInfoSpec);
};
