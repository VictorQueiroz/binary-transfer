import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import ParamEnum from './ParamEnum';
import BaseConstructor from './BaseConstructor';

class SchemaBuilder {
    constructor(options = {}) {
        _.defaultsDeep(options, {
            generics: BaseConstructor.generics,
            binaryTransferPath: 'binary-transfer'
        });

        this.vector = options.vector;
        this.schemas = options.schemas;
        this.generics = options.generics;
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
                binaryTransferPath: this.binaryTransferPath
            }
        });

        return files;
    }

    createTypeFile(type, schema) {
        const context = {
            type: {
                name: type
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

    /**
     * Collect all possible ids for identifier
     */
    parseIdentifier(id, ...schemas) {
        const isTypeReference = BaseConstructor.isTypeReference(id);
        const isConstructorReference = BaseConstructor.isConstructorReference(id);
        const compareProperty = (
            isTypeReference && 'type' ||
            isConstructorReference && 'name'
        );

        const ids = [];
        const schema = schemas.find(schema => {
            schema.constructors.predicates.forEach(predicate => {
                if(predicate[compareProperty] == id) {
                    ids.push(predicate.id);
                }
            });
            return ids.length > 0;
        });

        return {
            type: id,
            possibleIds: ids
        };
    }

    createParam(param, predicate, schema) {
        const schemas = [
            schema,
            ...this.schemas.filter(schema2 => schema != schema2)
        ];

        if(BaseConstructor.isVectorType(param.type)) {
            let type = param.type.substring(7, param.type.length - 1);

            if(!this.generics.hasOwnProperty(type)) {
                type = this.parseIdentifier(type, ...schemas).type;
            }

            return {
                key: param.name,
                type: ParamEnum.GENERIC | ParamEnum.VECTOR,
                vectorOf: type
            };
        }

        let strictSizeMatch;

        if((strictSizeMatch = /^([a-z]+)\[([0-9]+)\]$/.exec(param.type))) {
            const genericType = strictSizeMatch[1];

            return {
                key: param.name,
                type: ParamEnum.GENERIC | ParamEnum.GENERIC_STRICT_SIZE,
                method: this.generics[genericType],
                genericType,
                specificSize: parseInt(strictSizeMatch[2])
            };
        }

        if(BaseConstructor.isGenericType(param.type)) {
            return {
                key: param.name,
                type: ParamEnum.GENERIC,
                method: this.generics[param.type],
                genericType: param.type
            };
        }

        const id = this.parseIdentifier(param.type, ...schemas);

        if(BaseConstructor.isTypeReference(param.type)) {
            return {
                key: param.name,
                type: ParamEnum.CONTAINER_TYPE_REFERENCE,
                reference: id.type,
                possibleIds: id.possibleIds
            };
        }

        if(BaseConstructor.isConstructorReference(param.type)) {
            return {
                key: param.name,
                type: ParamEnum.CONTAINER_REFERENCE,
                reference: id.type,
                possibleIds: id.possibleIds
            };
        }
    }

    createPredicate(predicate, schema) {
        const typeFile = this.createTypeFile(predicate.type, schema);
        const filePath = path.join(schema.name, 'constructors', path.join(...predicate.name.split('.')) + '.js');
        const rootPath = path.join(...path.dirname(path.join(...filePath.split('/'))).split('/').map(() => '..'));

        const files = [];

        const name = predicate.name;
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
