

Important!
----------

While the software has demonstrated ample stability under test
conditions, it is still under active development, and subject to
potentially breaking changes from time to time. The latest tagged
version may be used in lightweight, non-critical production deployments,
i.e., systems which do not impact primary business functions if they
face downtime or data loss/corruption. Note that there are **no
battle-hardened, stable releases yet**.

Disclaimer
~~~~~~~~~~

The authors and maintainers of RecallGraph are not liable for damages or
indemnity (express or implied) for loss of any kind incurred directly or
indirectly as a result of using this software.

Do I Need a 'Versioned Graph' Database?
---------------------------------------

To get an idea of where such a data store might be used, see:

1. `The Case for Versioned Graph
   Databases <https://adityamukho.com/the-case-for-versioned-graph-databases/>`__,
2. `Illustrative Problems in Dynamic Network
   Analysis <https://en.wikipedia.org/wiki/Dynamic_network_analysis#Illustrative_problems_that_people_in_the_DNA_area_work_on>`__

Also check out the recording below (RecallGraph Presented @ ArangoDB
Online Meetup) |YouTube link for RecallGraph presentation|

**TL;DR:** RecallGraph is a potential fit for scenarios where data is
best represented as a network of vertices and edges (i.e., a graph)
having the following characteristics:

1. Both vertices and edges can hold properties in the form of
   attribute/value pairs (equivalent to JSON objects).
2. Documents (vertices/edges) mutate within their lifespan (both in
   their individual attributes/values and in their relations with each
   other).
3. Past states of documents are as important as their present,
   necessitating retention and queryability of their change history.

Refer to the `wiki <https://github.com/RecallGraph/RecallGraph/wiki>`__
for an in-depth introduction.

Salient API Features
--------------------

RecallGraph's API is split into 3 top-level categories:

Document
~~~~~~~~

-  **Create** - Create single/multiple documents (vertices/edges).
-  **Replace** - Replace entire single/multiple documents with new
   content.
-  **Delete** - Delete single/multiple documents.
-  **Update** - Add/Update specific fields in single/multiple documents.
-  **(Planned) Explicit Commits** - Commit a document's changes
   separately, after it has been written to DB via other means (AQL /
   Core REST API / Client).
-  **(Planned) CQRS/ES Operation Mode** - Async implicit commits.

Event
~~~~~

-  **Log** - Fetch a log of events (commits) for a given path pattern
   (path determines scope of documents to pick). The log can be
   optionally grouped/sorted/sliced within a specified time interval.
-  **Diff** - Fetch a list of forward or reverse commands (diffs)
   between commits for specified documents.
-  **(Planned) Branch/Tag** - Create parallel versions of history,
   branching off from a specific event point of the main timeline. Also,
   tag specific points in branch+time for convenient future reference.
-  **(Planned) Materialization** - Point-in-time checkouts.

History
~~~~~~~

-  **Show** - Fetch a set of documents, optionally
   grouped/sorted/sliced, that match a given path pattern, at a given
   point in time.
-  **Filter** - In addition to a path pattern like in **'Show'**, apply
   an expression-based, simple/compound post-filter on the retrieved
   documents.
-  **Traverse** - A point-in-time traversal (walk) of a past version of
   the graph, with the option to apply additional post-filters to the
   result.

Installation
------------

RecallGraph installs like any other *Foxx Microservice* inside a
database, on an ArangoDB instance.

1. Download the `latest
   release <https://github.com/RecallGraph/RecallGraph/releases>`__.
2. Follow the instructions in the `Foxx Deployment
   Manual <https://www.arangodb.com/docs/3.5/foxx-deployment.html>`__.
   The web interface is the easiest, while the ``foxx-cli`` is more
   suitable for power users.

Installation Notes
~~~~~~~~~~~~~~~~~~

1. Refer to the
   `wiki <https://github.com/RecallGraph/RecallGraph/wiki/Installation#from-source>`__
   if you want to install from source.
2. A *one-click* cloud deployment option might be made available in the
   future for those who wish to take RecallGraph for a test ride without
   having to set up a server from scratch.

Docs
----

-  Quick-reference API documentation is available directly in the
   Swagger console (accessed through ArangoDB's web UI).
-  Detailed API docs, tutorials and technical docs are being worked on,
   and are being uploaded to the
   `wiki <https://github.com/RecallGraph/RecallGraph/wiki>`__ as and
   when they get ready.

Limitations
-----------

1. Although the test cases are quite extensive and have good coverage,
   this service has only been tested on single-instance DB deployments,
   and **not on clusters**.
2. As of version 3.5, ArangoDB does not support ACID transactions for
   multi-document/collection writes in `cluster
   mode <https://www.arangodb.com/docs/3.5/transactions-limitations.html#in-clusters>`__.
   Transactional ACIDity is not guaranteed for such deployments.

Development Roadmap
-------------------

1. Support for absolute/relative revision-based queries on individual
   documents (in addition to the timestamp-based queries supported
   currently),
2. Branching/tag support,
3. Support for the *valid time* dimension in addition to the currently
   implemented *transaction time* dimension
   (`https://www.researchgate.net/publication/221212735_A_Taxonomy_of_Time_in_Databases <https://www.researchgate.net/publication/221212735_A_Taxonomy_of_Time_in_Databases>`__),
4. Support for ArangoDB v3.6,
5. Multiple, simultaneous materialized checkouts (a la ``git``) of
   selectable sections of the database (entire DB, named graph, named
   collection, document list, document pattern), with eventual
   branch-level specificity,
6. CQRS/ES operation mode (async implicit commits),
7. Explicit commits,
8. Support for ArangoDB clusters (limited at present by lack of support
   for multi-document ACID transactions in clusters).
9. Multiple authentication and authorization mechanisms.

Get in Touch
------------

-  Raise an issue or PR on this repo, or
-  Mail me (email link in Github profile), or
-  Join the Gitter channel -
   `https://gitter.im/RecallGraph/community <https://gitter.im/RecallGraph/community>`__.

.. |Logo| image:: ../../assets/RecallGraph-Inline.jpeg
.. |Build Status| image:: https://travis-ci.org/RecallGraph/RecallGraph.svg?branch=development
   :target: https://travis-ci.org/RecallGraph/RecallGraph
.. |Quality Gate Status| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=alert_status
   :target: https://sonarcloud.io/dashboard?id=adityamukho_evstore
.. |Coverage| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=coverage
   :target: https://sonarcloud.io/component_measures?id=adityamukho_evstore&metric=coverage
.. |Maintainability Rating| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=sqale_rating
   :target: https://sonarcloud.io/dashboard?id=adityamukho_evstore
.. |Reliability Rating| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=reliability_rating
   :target: https://sonarcloud.io/dashboard?id=adityamukho_evstore
.. |Security Rating| image:: https://sonarcloud.io/api/project_badges/measure?project=adityamukho_evstore&metric=security_rating
   :target: https://sonarcloud.io/dashboard?id=adityamukho_evstore
.. |YouTube link for RecallGraph presentation| image:: http://img.youtube.com/vi/UP2KDQ_kL4I/0.jpg
   :target: http://www.youtube.com/watch?v=UP2KDQ_kL4I
