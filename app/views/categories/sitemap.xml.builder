xml.instruct!
xml.urlset "xmlns" => "http://www.sitemaps.org/schemas/sitemap/0.9" do

  xml.url do
    xml.loc "http://www.elitehouse.lv"
    xml.priority 1.0
  end

  [ "lv", "ru", nil ].each do |locale|
    @categories.each do |category|
      xml.url do
        xml.loc category_furniture_index_url(:category_id => category, :locale => locale)
        xml.priority 0.9
        xml.lastmod l ( category.furniture.empty? ? Time.now : category.furniture.sort_by(&:created_at).last.updated_at )
      end
    end
  
    @sub_categories.each do |sc|
      xml.url do
        xml.loc sub_category_furniture_index_url(:sub_category_id => sc, :locale => locale)
        xml.priority 0.9
        xml.lastmod l ( sc.furniture.empty? ? Time.now : sc.furniture.sort_by(&:created_at).last.updated_at )
      end
    end
  
    xml.url do
      xml.loc building_categories_url(:locale => locale)
      xml.priority 0.8
      
    end
  
    xml.url do
      xml.loc contacts_categories_url(:locale => locale)
      xml.priority 0.8
    end
  
    xml.url do
      xml.loc categories_url(:locale => locale)
      xml.priority 0.8
    end
  end
end