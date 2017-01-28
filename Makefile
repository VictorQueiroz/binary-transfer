tdd:
	./node_modules/.bin/mocha --check-leaks --bail --colors --require babel-register -w test/**/*.js

run_tests:
	node build-test-schema.js && \
	scripts/create-release.sh && \
	./node_modules/.bin/mocha --check-leaks --bail --colors --require babel-register test/**/*.js && \
	node benchmark.js
