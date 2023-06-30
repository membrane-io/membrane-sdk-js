export default {
    imports: [{
      id: "00000000-0000-1000-8000-000000000000",
      name: "test",
      types: [
        {
          name: 'Root',
          fields: [],
          actions: [],
          events: [],
        },
        {
          name: "ThingCollection_at_params",
          fields: [
            { name: 'field', type: 'Int' }
          ],
        },
        {
          name: "ThingCollection",
          actions: [],
          events: [],
          fields: [],
        },
        {
          name: "Thing",
          actions: [{
            name: "doSomething",
            params: [{
              name: "text",
              type: "String"
            }],
            type: "Int"
          }],
          description: "A simple thing",
          events: [{
            name: "somethingHappened",
            type: "SomethingHappenedEvent"
          }],
          fields: [
            { name: "field", type: "String" },
            { name: "int", type: "Int" },
            { name: "float", type: "Float" },
            { name: "bool", type: "Boolean" },
            { name: "related", type: "ThingCollection" },
            { name: "stringRef", type: "Ref", ofType: "String" },
            {
              name: "otherImport",
              type: "00000000-0000-1000-8000-000000000001:Root"
            },
          ]
        },
        {
          name: "SomethingHappenedEvent",
          actions: [],
          events: [],
          fields: [{
            name: "text",
            type: "String"
          },
            {
              name: "thing",
              type: "Thing"
            }
          ],
        }
      ]
    },
      {
        name: "test2",
        id: "00000000-0000-1000-8000-000000000001",
        types: [
          {
            name: "Root",
            fields: [
              {
                name: 'self',
                type: 'Ref',
                ofType: 'Root',
              }
            ],
            computedFields: [],
            actions: [],
            events: [],
          }
        ]
      }
    ],
    types: [
      {
        name: "Root",
        actions: [
          {
            name: "anAction",
            params: [{
              name: "value",
              type: "String",
            }],
            type: 'Void',
          }
        ],
        events: [
          {
            name: "anEvent",
            params: [{
              name: "value",
              type: "String",
            }],
          },
        ],
        fields: [
          {
            name: "thing",
            type: "00000000-0000-1000-8000-000000000000:ThingCollection"
          },
          {
            name: "ownThing",
            type: "OwnThing"
          },
        ],
      },
      {
        name: "OwnThing",
        actions: [],
        events: [],
        fields: [
          { name: "field", type: "String" },
          { name: "fieldRef", type: "Ref", ofType: { type: "String" } },
          { name: "fields", type: "List", ofType: "String" },
          { name: "int", type: "Int" },
          { name: "float", type: "Float" },
          { name: "bool", type: "Boolean" },
          { name: "ownThingRef", type: "Ref", ofType: "OwnThing" },
          { name: "strList", type: "List", ofType: "String" },
          { name: "strListList", type: "List", ofType: { type: "List", ofType: "String" } },
          { name: "thingRef", type: "Ref", ofType: "00000000-0000-1000-8000-000000000000:Thing" },
          { name: "voidRef", type: "Ref", ofType: "Void" },
          { name: "void", type: "Void" },
        ],
      }
    ]
  };
  