tdd:
	NODE_ENV=development ./node_modules/.bin/mocha \
	test/ \
	--recursive \
	--colors \
	--bail \
	--watch \
	--require babel-register \
	--check-leaks

benchmark:
	node benchmark/index.js

test:
	NODE_ENV=development ./node_modules/.bin/mocha \
	test/ \
	--recursive \
	--check-leaks \
	--bail \
	--colors \
	--require babel-register

release: test
	rm -rvf lib/
	./node_modules/.bin/babel src/ -d lib/

.PHONY: release test tdd
