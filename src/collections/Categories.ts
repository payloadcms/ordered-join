import { Category, Post } from "@/payload-types";
import { CollectionConfig } from "payload";

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'title',
  },
  hooks: {
    afterRead: [
      async ({ doc, req: { payload } }) => {
        let joinedPosts: Category['posts'] = doc.posts

        if (!joinedPosts) {
          // Some operations (update, create) do not return joins
          // so we will attempt to re-query for them ourselves if they are missing
          // Could be removed in future versions of Payload if we return joins from update / create
          const withJoin = await payload.findByID({
            collection: 'categories',
            id: doc.id,
            depth: 1
          })

          joinedPosts = withJoin.posts
        }

        if (joinedPosts?.docs) {
          // Store IDs for any posts to query (were not populated - maybe depth: 0)
          const postsToQuery: string[] = []

          // Store any posts that were successfully populated
          const posts: Post[] = [];

          joinedPosts.docs.forEach((post) => {
            if (typeof post === 'string') {
              postsToQuery.push(post)
            } else if (post && post.id) {
              posts.push(post)
            }
          })

          // Get any posts that were not populated
          const queriedPosts = await payload.find({
            collection: 'posts',
            limit: 0,
            where: {
              id: {
                in: postsToQuery
              }
            },
            depth: 0,
          })

          // Concat and sort by order
          const allPosts = queriedPosts.docs.concat(posts).sort((a: Post, b: Post) => a.order - b.order)

          // Surface any data that should be editable here
          // in a virtual array
          doc.editablePosts = allPosts.map((post: Post) => ({
            id: post.id,
            title: post.title,
            existing: true,
          }))
        }


        return doc
      }
    ],
    beforeChange: [
      async ({ originalDoc, data, req, req: { payload } }) => {
        const newPostsByID: Map<string, Partial<Post>> = new Map()


        // We need to see if any of the data for editablePosts changes
        // Create the data to compare against
        data.editablePosts.forEach((post: Post, i: number) => {
          const order = i + 1

          newPostsByID.set(
            post.id,
            {
              title: post.title,
              order,
              category: originalDoc.id
            }
          )
        })

        // Find the original docs of all the 
        // editablePosts that we received
        const originalPostsQuery = await payload.find({
          collection: 'posts',
          depth: 0,
          limit: 0,
          where: {
            id: {
              in: Array.from(newPostsByID.keys())
            }
          }
        })


        // Compare the new post to the old post
        // If they have not changed, remove them from newPostsByID
        originalPostsQuery.docs.forEach((doc) => {
          const newPost = newPostsByID.get(doc.id)

          if (newPost) {
            const propsToCompare = ['order', 'title'] as const

            const hasChanged = propsToCompare.some((prop) => {
              return newPost[prop] !== doc[prop]
            })

            if (!hasChanged) {
              newPostsByID.delete(doc.id)
            }
          }
        })

        // We will now update posts remaining in the newPostsByID map
        // - at this point, we know they have changed
        Promise.all(Array.from(newPostsByID).map(async ([id, doc]) => {
          console.log({ id, doc })
          await payload.update({
            collection: 'posts',
            req, // pass the req so it is all part of same db transaction
            depth: 0,
            id,
            data: doc,
          })
        }))
      }
    ]
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      // Typical join field, we use this
      // for query performance
      // but it will be disabled in admin UI.
      name: 'posts',
      type: 'join',
      collection: 'posts',
      on: 'category',
      admin: {
        disabled: true,
      }
    },
    {
      // Virtual field, meant only to 
      // use its UI in the admin panel
      name: 'editablePosts',
      type: 'array',
      virtual: true,
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'existing',
          type: 'checkbox',
          admin: {
            hidden: true,
          }
        }
      ]
    }
  ]
}