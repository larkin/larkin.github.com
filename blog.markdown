---
permalink: /blog.html
title: Pete Richards | Blog
layout: main
nav_item: blog
---

{% for post in site.posts %}
<section>
	<h1>{{ post.date | date: "%Y-%m-%d" }}</h1>
	<div class="card">
		<h2><a href="{{ post.url }}"> {{ post.title }}</a></h2>
	</div>
</section>
{% endfor %}