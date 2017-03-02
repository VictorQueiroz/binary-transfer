import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import BaseConstructor from './BaseConstructor';

class SchemaBuilder {
    constructor(options = {}) {
        _.defaults(options, {
            binaryTransferPath: 'binary-transfer'
        });

        this.schemas = options.schemas;
        this.generics = BaseConstructor.generics;
        this.binaryTransferPath = options.binaryTransferPath;
    }

    build() {
        const files = [];

        this.schemas.forEach(schema => {
            const constructors = [];

            schema.constructors.predicates.map(predicate => {
                const result = this.createPredicate(predicate, schema);

                result.predicates.forEach(file => {
                    constructors.push(file);
                });
                files.push(...result.predicates, ...result.types);
            });

            files.push({
                filePath: path.join(schema.name, 'index.js'),
                template: fs.readFileSync(path.resolve(__dirname, 'templates/schema_index.template')),
                context: {
                    constructors: constructors.map(file => {
                        const name = file.context.predicate.name.split('.');
                        name.splice(name.length - 1, 1, file.context.constructorName);

                        return {
                            name: name.join('.'),
                            filePath: path.join('..', file.filePath)
                        };
                    })
                }
            });
        });

        files.push({
            filePath: './ConstructorStore.js',
            template: fs.readFileSync(path.resolve(__dirname, 'templates/constructor_store.template')),
            context: {

            }
        });

        files.push({
            filePath: './index.js',
            template: fs.readFileSync(path.resolve(__dirname, 'templates/root_index.template')),
            context: {
                schemas: this.schemas.map(schema => schema.name),
                binaryTransferPath: this.binaryTransferPath
            }
        });

        files.push({
            filePath: './Vector.js',
            template: fs.readFileSync(path.resolve(__dirname, 'templates/vector.template')),
            context: {
                generics: this.generics,
                lodashMethods: [
                    'get', 'first', 'last', 'tail',
                    'head', 'shuffle'
                ],
                nativeArrayMethods: [
                    'forEach', 'shift', 'pop', 'push',
                    'map', 'join', 'sort', 'concat',
                    'indexOf', 'slice', 'some', 'reduce',
                    'reduceRight', 'reverse', 'values',
                    'keys', 'filter', 'find', 'fill', 'every',
                    'entries', 'lastIndexOf', 'includes',
                    'splice'
                ],
                binaryTransferPath: this.binaryTransferPath
            }
        });

        return files;
    }

    createTypeFile(type, schema) {
        const context = {
            type: {
                name: `${schema.name}.${type}`
            },
            possibleIds: schema.constructors.predicates.map(predicate => {
                return predicate.id;
            }),
            constructorName: BaseConstructor.getConstructorName(type) + 'Type',
            binaryTransferPath: this.binaryTransferPath
        };

        return {
            template: fs.readFileSync(path.resolve(__dirname, 'templates/type.template')),
            filePath: path.join(schema.name, 'types', path.join(...type.split('.')) + '.js'),
            context
        };
    }

    createParam(param, predicate, schema) {
        if(BaseConstructor.isVectorType(param.type)) {
            let type = param.type.substring(7, param.type.length - 1);

            if(!this.generics.hasOwnProperty(type)) {
                type = `${schema.name}.${type}`;
            }

            return {
                key: param.name,
                type,
                vector: true
            };
        }

        if(BaseConstructor.isGenericType(param.type)) {
            return {
                key: param.name,
                type: param.type,
                method: this.generics[param.type],
                generic: true,
            };
        }

        const possibleIds = [];


        if(BaseConstructor.isTypeReference(param.type)) {
            schema.constructors.predicates.map(predicate => {
                if(predicate.type == param.type) {
                    possibleIds.push(predicate.id);
                }
            });

            return {
                key: param.name,
                type: `${schema.name}.${param.type}`,
                possibleIds: possibleIds,
                typeReference: true
            };
        }

        if(BaseConstructor.isConstructorReference(param.type)) {
            schema.constructors.predicates.map(predicate => {
                if(predicate.name == param.type) {
                    possibleIds.push(predicate.id);
                }
            });

            return {
                key: param.name,
                type: `${schema.name}.${param.type}`,
                possibleIds: possibleIds,
                constructorReference: true
            };
        }
    }

    createPredicate(predicate, schema) {
        const typeFile = this.createTypeFile(predicate.type, schema);
        const filePath = path.join(schema.name, 'constructors', path.join(...predicate.name.split('.')) + '.js');
        const rootPath = path.join(...path.dirname(path.join(...filePath.split('/'))).split('/').map(() => '..'));

        const files = [];

        const name = `${schema.name}.${predicate.name}`;
        const context = {
            schema,
            params: predicate.params.map(param => {
                return this.createParam(param, predicate, schema);
            }),
            rootPath,
            generics: this.generics,
            predicate,
            typeFileData: {
                ...typeFile,
                filePath: path.join(rootPath, typeFile.filePath)
            },
            constructorName: BaseConstructor.getConstructorName(name),
            binaryTransferPath: this.binaryTransferPath
        };

        files.push({
            filePath,
            template: fs.readFileSync(path.resolve(__dirname, 'templates/constructor.template')),
            context
        });

        return {
            types: [typeFile],
            predicates: files
        };
    }
}

export default SchemaBuilder;
