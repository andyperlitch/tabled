test:
	./node_modules/.bin/browserify ./test/suite.js -o ./test/test.bundle.js
examples:
	./node_modules/.bin/browserify ./examples/example1/start.js -o ./examples/example1/bundle.js
	./node_modules/.bin/browserify ./examples/example2/start.js -o ./examples/example2/bundle.js
	./node_modules/.bin/browserify ./examples/example3/start.js -o ./examples/example3/bundle.js
	./node_modules/.bin/browserify ./examples/example4/start.js -o ./examples/example4/bundle.js --debug
nobr:
	./node_modules/.bin/browserify nobr.js -x backbone -x underscore > standalone/tabled.js
	node ./standalone/wrapStandalone.js
	uglifyjs standalone/tabled.js -o standalone/tabled.min.js
livetest:
	# go to http://localhost:9478/testrunner_LIVE.html
	beefy test/suite.js:test.bundle.js 9478 --live 9479 -- -t ktbr --debug
.PHONY: test