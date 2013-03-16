---
title: Configuring a Static Asset Pipeline with Django and Heroku
layout: post
---

*Note:* this is a repost of something I originally wrote while at Refer.ly.  You can find the original post [here][original-post].

Recently, I was tasked with overhauling the asset pipeline for a Django application being hosted on Heroku.  The idea being that we want static files to deploy seamlessly when we push new code and yet maintain a different set of static files while working in development, staging, and on production.  Additionally, user-uploaded media should work as expected: on production it should be uploaded to S3 and in development it should be stored locally.

This was my first major task in this code base, and needless to say, there was a lot to learn.  While I have experience running Django on a standard stack, this would be my first time working with Heroku, and I was surprised to find that this wasn't nearly as straightforward as I expected.  Hopefully my experiences here can help others get this set up correctly from the start.

### Some Background: Django & Static Files

When you're working in the development environment (`DEBUG = True` and using `manage.py runserver`), Django serves all static content for you from the `STATIC_URL`, allowing you to make changes to the static files and view them with a simple refresh.

Now, when you deploy to production and set `DEBUG = False`, Django no longer serves static assets from `STATIC_URL`-- instead, it expects you to serve these asset files using your webserver.  This is good, because using Django to serve static files is a huge waste of resources.  However, it means that every time you deploy new static assets, you have to manually copy them to the static root your website has configured-- something you'll probably want to automate in your deploy process.

**But wait:** someone already figured out the code for deployments, and you don't have to!  As long as you're using the default `django.contrib.staticfiles` app, all you have to do is run `python manage.py collectstatic`, which collects all of your static assets and places them in the `STATIC_ROOT` you defined, which can then be served by your faithful webserver of choice.  But what if you don't control the webserver?

### Enter Heroku

Now, Heroku is smart enough to automatically run collectstatic for you when you deploy code, and even includes some [troubleshooting advice][heroku-django], but unless you define a Django view to serve files from the `STATIC_ROOT`, you won't actually be serving these files.  And if you do use Django to serve these files, you are wasting valuable dyno hours on static files.

Unfortunately, Heroku's guide on using Django and static files has no actual details on how you should configure Django to serve static files.  Even worse, a quick google search for "heroku static files django" returns a [number][sol1] of [solutions][sol3] that [directly contradict][sol2] the advice given in the [Django docs][dadvice], which is deserves to be quoted verbatim here(emphasis theirs):

> This view[static file serve] will only work if DEBUG is True.

> That's because this view is **grossly inefficient** and **probably insecure**. This is only intended for local development, and should **never be used in production**.

Why Django even includes instructions for using this code in production is beyond me.  Thankfully, a google search for "proper way to handle static files for django on heroku" turns up a [stack overflow answer][stack-overflow] from [intenex][souser] with the correct solution: use `django-storages`.  By implementing a different storage backend, such as S3, `collectstatic` will automatically collect your static files to S3 and serve them faithfully.

### So here's how to set it up:

1.  Add `django-storages` and `boto` to your `requirements.txt` and run `pip install -r requirements.txt` to install them.

2.  Add `storages` to your `INSTALLED_APPS` in `settings.py`.

3.  Add AWS keys to your Heroku config if you haven't already: 

    ```bash
    heroku config:add AWS_ACCESS_KEY_ID=YOURACCESSKEY
    heroku config:add AWS_SECRET_ACCESS_KEY=YOURSECRETACCESSKEY
    ```

4.  Create a file called `s3storages.py` in the project root dir and add:

    ```python
    from storages.backends.s3boto import S3BotoStorage
    
    # Define bucket and folder for static files.
    StaticStorage = lambda: S3BotoStorage(
        bucket='yourbucket', 
        location='assets')
    
    # Define bucket and folder for media files.
    MediaStorage  = lambda: S3BotoStorage(
        bucket='yourbucket',
        location='media')
    ```

5.  update `settings.py` with the following:

    ```python
    if DEBUG:
        # Development storage using local files.
        STATIC_URL = '/static/'
        ADMIN_MEDIA_PREFIX = '/static/admin/'
        MEDIA_URL = '/media/'
        MEDIA_ROOT = '/path/to/development/media'
    
    if not DEBUG:
        # Production storage using s3.
        DEFAULT_FILE_STORAGE = 's3storages.MediaStorage'
        STATICFILES_STORAGE = 's3storages.StaticStorage'
        STATIC_URL = 'https://s3.amazonaws.com/yourbucket/assets'
        ADMIN_MEDIA_PREFIX = 'https://s3.amazonaws.com/yourbucket/assets/admin/'
        MEDIA_URL = 'https://s3.amazonaws.com/yourbucket/static/'
    ```

6.  Inside of templates, use `{{ MEDIA_URL }}` and `{{ STATIC_URL }}` as your roots and they will work seamlessly on production and development.

7.  You'll need to tell heroku to allow deployment scripts to access the AWS credentials in the environment by running `heroku labs:enable user-env-compile -a myapp`

### Some Final Notes

**What about user uploaded media?** If you're using the Django forms module, and using FileField on your models, django-storages will automatically store your media in the correct place: S3 for production, and the local filesystem for development.

**Use absolute S3 paths in js/css:** Since you can't use template variables in css/js, you'll have to upload images to S3 and use the full path to the image, i.e. `background-image: url(http://s3.amazonaws.com/yourbucket/assets/image.png);`.  Using a preprocessor may allow you to get around this, but I'm going to save that for a follow-up post.

**Careful:** if you're not using `render()` (which automatically adds the default `RequestContext`) or specifying a `context_instance` in your `render_to_response()` calls, you need to pass `MEDIA_URL` and `STATIC_URL` values to the template.  If you're using templates to generate emails, double check them!

[original-post]: https://refer.ly/configuring-a-static-asset-pipeline-with-django-and-heroku/c/b439813680dc11e2bfbf22000a1db8fa
[heroku-s3]: https://devcenter.heroku.com/articles/s3

[heroku-django]: https://devcenter.heroku.com/articles/django-assets

[stack-overflow]: http://stackoverflow.com/questions/11569144/proper-way-to-handle-static-files-and-templates-for-django-on-heroku

[souser]: http://stackoverflow.com/users/674794/intenex

[sol1]: http://stackoverflow.com/a/9332738

[sol2]: http://matthewphiong.com/managing-django-static-files-on-heroku

[sol3]: http://idocode.blogspot.com/2012/01/django-static-files-on-heroku.html

[dadvice]: https://docs.djangoproject.com/en/dev/ref/contrib/staticfiles/#django.contrib.staticfiles.templatetags.staticfiles.django.contrib.staticfiles.views.serve