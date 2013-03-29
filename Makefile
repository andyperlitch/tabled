test:
	./node_modules/.bin/browserify ./test/suite.js -o ./test/test.bundle.js
all:
	./node_modules/.bin/browserify ./examples/example1/start.js -o ./examples/example1/bundle.js
livetest:
	beefy test/suite.js:test.bundle.js 9478 --live 9479 -- -t ktbr --debug
.PHONY: test