module ApplicationHelper
  def url_for_category(category)
    if category.sub_categories.size > 1
      category_sub_categories :category => category
    else
      sub_category_furniture_index_path :sub_category => category.sub_categories.first
    end
  end
  
  def sub_menu_items(category)
    category.sub_categories.map do |sc|
      {
        :key => sc.key,
        :name => sc.name,
        :url => sub_category_furniture_index_path :sub_category => sc
      }
    end
  end
  
  def menu_items
    categories = Categories.all
    result = []
    
    categories.each do |category|
      {
        :name => category.name,
        :key => category.key,
        :url => url_for_category(category),
        :items => sub_menu_items(category)
      }
    end
  end
end
