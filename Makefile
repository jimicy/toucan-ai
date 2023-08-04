all: compile_flask compile_frontend

compile_flask:
	pip install -r requirements.txt
	mkdir -p uploads

compile_frontend:
	cd frontend && \
	npm install && \
	npm run build
