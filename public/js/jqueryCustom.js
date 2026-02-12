jQuery(document).ready(function ($) {
    'use strict';

    const slider = function () {
        $('.nonloop-block-3').owlCarousel({
            center: false,
            items: 1,
            loop: true,
            stagePadding: 15,
            margin: 20,
            nav: true,
            navText: [
                '<i class="fa-solid fa-arrow-left">',
                '<i class="fa-solid fa-arrow-right">',
            ],
            responsive: {
                600: {
                    margin: 20,
                    items: 2,
                },
                1000: {
                    margin: 20,
                    items: 3,
                },
                1200: {
                    margin: 20,
                    items: 3,
                },
            },
        });
    };
    slider();

    const siteMenuClone = function () {
        $('<div class="site-mobile-menu"></div>').prependTo('.site-wrap');

        $('<div class="site-mobile-menu-header"></div>').prependTo(
            '.site-mobile-menu'
        );
        $('<div class="site-mobile-menu-close "></div>').prependTo(
            '.site-mobile-menu-header'
        );
        $('<div class="site-mobile-menu-logo"></div>').prependTo(
            '.site-mobile-menu-header'
        );

        $('<div class="site-mobile-menu-body"></div>').appendTo(
            '.site-mobile-menu'
        );

        $('.js-logo-clone').clone().appendTo('.site-mobile-menu-logo');

        $('<span class="ion-ios-close js-menu-toggle"></div>').prependTo(
            '.site-mobile-menu-close'
        );

        $('.js-clone-nav').each(function () {
            const $this = $(this);
            $this
                .clone()
                .attr('class', 'site-nav-wrap')
                .appendTo('.site-mobile-menu-body');
        });

        setTimeout(function () {
            let counter = 0;
            $('.site-mobile-menu .has-children').each(function () {
                const $this = $(this);

                $this.prepend('<span class="arrow-collapse collapsed">');

                $this.find('.arrow-collapse').attr({
                    'data-toggle': 'collapse',
                    'data-target': '#collapseItem' + counter.toString(),
                });

                $this.find('> ul').attr({
                    class: 'collapse',
                    id: 'collapseItem' + counter.toString(),
                });

                counter++;
            });
        }, 1000);

        $('body').on('click', '.arrow-collapse', function (e) {
            const $this = $(this);
            if ($this.closest('li').find('.collapse').hasClass('show')) {
                $this.removeClass('active');
            } else {
                $this.addClass('active');
            }
            e.preventDefault();
        });

        $(window).resize(function () {
            const $this = $(this);
            const w = $this.width();

            if (w > 768) {
                if ($('body').hasClass('offcanvas-menu')) {
                    $('body').removeClass('offcanvas-menu');
                }
            }
        });

        $('body').on('click', '.js-menu-toggle', function (e) {
            const $this = $(this);
            e.preventDefault();

            if ($('body').hasClass('offcanvas-menu')) {
                $('body').removeClass('offcanvas-menu');
                $this.removeClass('active');
            } else {
                $('body').addClass('offcanvas-menu');
                $this.addClass('active');
            }
        });

        // click outisde offcanvas
        $(document).mouseup(function (e) {
            const container = $('.site-mobile-menu');
            if (
                !container.is(e.target) &&
                container.has(e.target).length === 0
            ) {
                if ($('body').hasClass('offcanvas-menu')) {
                    $('body').removeClass('offcanvas-menu');
                }
            }
        });
    };
    siteMenuClone();

    const sitePlusMinus = function () {
        $('.js-btn-minus').on('click', function (e) {
            e.preventDefault();
            if (
                $(this).closest('.input-group').find('.form-control').val() != 0
            ) {
                $(this)
                    .closest('.input-group')
                    .find('.form-control')
                    .val(
                        parseInt(
                            $(this)
                                .closest('.input-group')
                                .find('.form-control')
                                .val()
                        ) - 1
                    );
            } else {
                $(this)
                    .closest('.input-group')
                    .find('.form-control')
                    .val(parseInt(0));
            }
        });
        $('.js-btn-plus').on('click', function (e) {
            e.preventDefault();
            $(this)
                .closest('.input-group')
                .find('.form-control')
                .val(
                    parseInt(
                        $(this)
                            .closest('.input-group')
                            .find('.form-control')
                            .val()
                    ) + 1
                );
        });
    };
    sitePlusMinus();

    let siteSliderRange = function () {
        $('#slider-range').slider({
            range: true,
            min: 0,
            max: 500,
            values: [75, 300],
            slide: function (event, ui) {
                $('#amount').val('$' + ui.values[0] + ' - $' + ui.values[1]);
            },
        });
        $('#amount').val(
            '$' +
                $('#slider-range').slider('values', 0) +
                ' - $' +
                $('#slider-range').slider('values', 1)
        );
    };
    siteSliderRange();
});
