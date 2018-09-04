/*
 * Copyright 2018 Asknow Solutions B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
(function ($global) {

	var DEFAULT_ID = 'iq';
	var DEFAULT_PURPOSE = 'ccp-6';
	var DEFAULT_COOKIE_NAME = '_iqprid';
	var DEFAULT_LIQUIDACCOUNT_PROPERTY_NAME = '_iqsTenant';
	var DEFAULT_API_BASE_PATH = 'https://myliquidsuite-api.iqnomy.com/api/liquidaccount/';
	var DEFAULT_API_PROFILE_PATH = '/profile/cookie/';
	var DEFAULT_API_PROFILE_ARGS = {
		params: {
			includeSessions: 10,
			includeEvents: 50
		}
	};

	// Private
	function getProfilePath($id) {
		var liquidAccountId = $global[DEFAULT_LIQUIDACCOUNT_PROPERTY_NAME];
		return DEFAULT_API_BASE_PATH + liquidAccountId + DEFAULT_API_PROFILE_PATH + $id;
	}

	function getProfile($context) {
		var id = this.getProfileId();

		return new Promise(function ($resolve, $reject) {
			if ((typeof id !== 'string') || id.trim().length === 0) {
				return $reject(-1);
			}
			var profilePath = getProfilePath(id);
			$context.getLib('http')
					.get(profilePath, DEFAULT_API_PROFILE_ARGS)
					.then(function ($response) {
						if (!$response || $response.status !== 200) {
							return $reject($response.status);
						}
						$resolve($response.body);
					}, function ($error) {
						$reject($error);
					});
		});
	}

	function deleteProfileLocal($context) {
		// TODO Clean this up
		var hostparts = window.location.hostname.toString()
				.split('.');
		var domain = '.' + hostparts[hostparts.length - 2] + '.' + hostparts[hostparts.length - 1];
		$context.getLib('cookie')
				.remove(DEFAULT_COOKIE_NAME, {domain: domain});
	}

	function deleteProfileRemote($context) {
		// Not implemented yet
		return new Promise(function ($resolve, $reject) {
			$resolve();
		});
	}

	function createProfileInfo($profile) {
		var self = this;
		var lastPages = getLastPages.call(self, $profile);
		lastPages = self.context.getLib("_").first(lastPages, 5);

		return {
			header: createProfileInfoHeader.call(self, lastPages),
			content: createProfileInfoContent.call(self, lastPages),
		};
	}

	function createProfileInfoHeader($lastPages) {
		return "<div style='float:left;font-weight: bold;width: 30px; text-align: center;'>" + $lastPages.length + "</div>" +
				"<div style='float:left;width: calc(100% - 30px);'>Je laatst bekeken pagina`s</div>";
	}

	function createProfileInfoContent($lastPages) {
		var _ = this.context.getLib("_");
		var pages = "";

		_.each($lastPages, function ($page) {
			pages = pages + "<ul style='margin: 7px 0px;list-style-position: inside; white-space: nowrap;overflow: hidden;text-overflow: ellipsis; width: 280px;' title='" + $page.url + "'>" + $page.url + "</ul>";
		});
		return "<ul style='margin: 10px 30px;list-style: none;font-size: 12px;'>" + pages + "</ul>";
	}

	function getLastPages($profile) {
		var lastPages = [];

		if (!$profile) {
			return lastPages;
		}

		var _ = this.context.getLib("_");
		_.each($profile.sessions, function ($session) {
			if ($session && $session.events) {
				_.each($session.events, function ($event) {
					if ($event && "PAGEVISIT" === $event.type) {
						lastPages.push({
							url: $event.url,
							dateCreated: $event.dateCreated
						});
					}
				});
			}
		});
		return lastPages;
	}

	function Plugin() {
	}

	Plugin.prototype.register = function ($context) {
		this.context = $context;
	};

	Plugin.prototype.getId = function () {
		return DEFAULT_ID;
	};

	Plugin.prototype.getProfileId = function () {
		return this.context.getLib('cookie')
				.get(DEFAULT_COOKIE_NAME);
	};

	Plugin.prototype.getProfileIds = function ($global) {
		throw new Error('Not supported.');
	};

	Plugin.prototype.getProfile = function () {
		return getProfile.call(this, this.context);
	};

	Plugin.prototype.getProfileInfo = function ($id) {
		var self = this;
		return new Promise(function ($resolve, $reject) {
			getProfile.call(self, self.context)
					.then(function ($profile) {
						return $resolve(createProfileInfo.call(self, $profile));
					}, function ($error) {
						return $reject(new Error('Unable to get profile. reason: ' + $error));
					});
		});
	};

	Plugin.prototype.deleteProfile = function () {
		var self = this;

		return new Promise(function ($resolve, $reject) {
			deleteProfileRemote.call(self, self.context)
					.then(function () {
						deleteProfileLocal.call(self, self.context);
						$resolve();
					}, function ($error) {
						$reject($error);
					});
		});
	};

	if (!$global || !$global.ConsentCookie || typeof $global.ConsentCookie.registerPlugin !== 'function') {
		throw new Error('ConsentCookie not available. Unable to register plugin: ' + DEFAULT_ID);
	}

	$global.ConsentCookie.registerPlugin(new Plugin());
	$global.ConsentCookie.on('consent', function ($payload) {
		if ($payload.id === DEFAULT_ID || $payload.id === DEFAULT_PURPOSE) {
			var consent = ConsentCookie.getConsent(DEFAULT_ID).isEnabled() || ConsentCookie.getConsent(DEFAULT_PURPOSE).isEnabled();
			window._iqsImpress = window._iqsImpress || {};
			window._iqsImpress.dnt = !consent;
		}
	});

})(window);
